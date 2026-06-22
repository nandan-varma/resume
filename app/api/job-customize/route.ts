import { generateText, Output } from "ai";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { resolveModel } from "@/lib/models";

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

  let latex: string;
  let jobDescription: string;
  let modelId: string;
  let answers: { key: string; question: string; answer: string }[];

  try {
    ({ latex, jobDescription, modelId, answers } = await req.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const answersSection =
    answers.length > 0
      ? `\n\nPreviously answered:\n${answers.map((a) => `- ${a.question}: ${a.answer}`).join("\n")}`
      : "";

  try {
    const { output } = await generateText({
      model: resolveModel(modelId),
      output: Output.object({
        schema: responseSchema,
        name: "ConsultationDecision",
      }),
      // Disable thinking — this is a simple yes/no structured decision.
      providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
      system: `You are a resume customization assistant checking whether you have all concrete facts needed before editing.

Rules:
- Ask ONLY if you genuinely cannot make a good tailored edit without that specific fact.
- Never ask about preferences or style — only concrete facts (metrics, project names, tech you'd have to invent).
- Make options specific and grounded in what's already in the resume.
- If you have enough info, respond with type "proceed".
- Ask at most one question per turn.`,
      prompt: `Resume:\n\`\`\`latex\n${latex.slice(0, 4000)}\`\`\`\n\nJob Description:\n${jobDescription.slice(0, 3000)}${answersSection}\n\nDo you need one more concrete fact to avoid fabricating? If yes, ask it. If no, proceed.`,
    });

    return Response.json(output);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const isQuota =
      msg.includes("quota") ||
      msg.includes("rate") ||
      msg.includes("429") ||
      (err as { statusCode?: number }).statusCode === 429;

    if (isQuota) {
      console.error("[job-customize] rate limit:", err);
      return Response.json(
        {
          error:
            "AI rate limit reached. Please wait or switch models in Settings.",
          rateLimited: true,
        },
        { status: 429 }
      );
    }

    console.error("[job-customize]", err);
    const errorMessage =
      err instanceof Error ? err.message : "Consultation failed";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
