import { generateText, Output } from "ai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { logApiError, logVendorTiming } from "@/lib/dev-log";
import { resolveModel } from "@/lib/models";
import { rateLimit } from "@/lib/rate-limit";

const MAX_LATEX_CHARS = 4000;
const MAX_JOB_DESC_CHARS = 3000;

const answerSchema = z.object({
  key: z.string(),
  question: z.string(),
  answer: z.string(),
});

const requestSchema = z.object({
  latex: z.string(),
  jobDescription: z.string(),
  modelId: z.string(),
  answers: z.array(answerSchema).default([]),
});

// Flat schema — no discriminated unions, no optional fields.
// Gemini collapses complex nested/union schemas into strings; flat + required is reliable.
const responseSchema = z.object({
  type: z
    .enum(["question", "proceed"])
    .describe(
      "Use 'question' if you need one more concrete fact; 'proceed' if you have enough to edit without fabricating."
    ),
  key: z
    .string()
    .describe(
      "Short camelCase identifier for the question (e.g. 'techStack'). Empty string when type is 'proceed'."
    ),
  question: z
    .string()
    .describe(
      "The clarifying question to show the user. Empty string when type is 'proceed'."
    ),
  options: z
    .array(z.string())
    .describe(
      "2–4 specific answer choices grounded in the resume. Empty array when type is 'proceed'."
    ),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`job-customize:${session.user.id}`, 30, 60_000)) {
    return Response.json(
      { error: "Too many requests. Please wait a minute." },
      { status: 429 }
    );
  }

  let latex: string;
  let jobDescription: string;
  let modelId: string;
  let answers: { key: string; question: string; answer: string }[];

  try {
    const body = await req.json();
    const parsed = requestSchema.parse(body);
    latex = parsed.latex;
    jobDescription = parsed.jobDescription;
    modelId = parsed.modelId;
    answers = parsed.answers;
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json(
        {
          error: `Invalid request: ${err.issues.map((e) => e.message).join(", ")}`,
        },
        { status: 400 }
      );
    }
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const answersSection =
    answers.length > 0
      ? `\n\nPreviously answered:\n${answers.map((a) => `- ${a.question}: ${a.answer}`).join("\n")}`
      : "";

  const truncatedLatex = latex.slice(0, MAX_LATEX_CHARS);
  const truncatedJobDesc = jobDescription.slice(0, MAX_JOB_DESC_CHARS);

  try {
    const startedAt = performance.now();
    const { output } = await generateText({
      model: resolveModel(modelId),
      output: Output.object({
        schema: responseSchema,
        name: "ConsultationDecision",
      }),
      // Disable thinking — this is a simple yes/no structured decision.
      providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
      system: `You are an ATS optimization specialist reviewing a resume before tailoring it to a specific job description. Your goal is to gather concrete facts needed to naturally insert job-matching keywords and quantifiable achievements — without fabricating anything.

Rules:
- Ask ONLY for a concrete missing fact that would directly enable a higher-quality ATS-targeted edit: a specific metric (%, $, users, time saved), an exact technology name from the JD you cannot confirm is in the resume, or a role-specific accomplishment you would otherwise have to invent.
- Prioritize questions about measurable outcomes and exact tool/technology names that appear in the job description but are ambiguous or absent in the resume.
- Make answer options specific and grounded in what is already present in the resume — never generic.
- Never ask about preferences, style, formatting, or subjective choices.
- If you have enough information to insert the job's required keywords accurately and naturally, respond with type "proceed".
- Ask at most one question per turn.`,
      prompt: `Resume:\n\`\`\`latex\n${truncatedLatex}\`\`\`\n\nJob Description:\n${truncatedJobDesc}${answersSection}\n\nDo you need one concrete fact to write an accurate, ATS-optimized edit? If yes, ask it. If no, proceed.`,
    });
    logVendorTiming(`[job-customize] ${modelId}`, startedAt);

    return Response.json(output);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const isQuota =
      msg.includes("quota") ||
      msg.includes("rate") ||
      msg.includes("429") ||
      (err as { statusCode?: number }).statusCode === 429;

    if (isQuota) {
      logApiError("[job-customize] rate limit:", err);
      return Response.json(
        {
          error:
            "AI rate limit reached. Please wait or switch models in Settings.",
          rateLimited: true,
        },
        { status: 429 }
      );
    }

    logApiError("[job-customize]", err);
    const errorMessage =
      err instanceof Error ? err.message : "Consultation failed";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
