import { streamText, tool } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { personalInformation } from "@/db/schema";
import { auth } from "@/lib/auth";
import { logApiError } from "@/lib/dev-log";
import { resolveModel } from "@/lib/models";
import { rateLimit } from "@/lib/rate-limit";

const historyMessageSchema = z.object({
  content: z.string(),
  role: z.enum(["user", "assistant"]),
});

const requestSchema = z.object({
  instruction: z.string().min(1, "Instruction is required"),
  latex: z.string().max(60_000, "LaTeX too large (max 60 000 chars)"),
  modelId: z.string(),
  history: z.array(historyMessageSchema).default([]),
  jobDescription: z.string().optional(),
  pageCount: z.number().int().positive().optional(),
});

interface HistoryMessage {
  content: string;
  role: "user" | "assistant";
}

// Client-side tool: the model calls this to make edits, but we apply them
// in the browser (against the live editor buffer) rather than executing here.
// Only outputs the changed sections, not the full document — cuts output
// tokens by ~10-20x compared to regenerating the full LaTeX.
const editResumeTool = tool({
  description:
    "Apply targeted find-and-replace edits to the LaTeX resume. Call this only when the user wants an actual change made to the document. For questions, plans, advice, or analysis, just answer in your normal text response and do not call this tool.",
  inputSchema: z.object({
    edits: z
      .array(
        z.object({
          find: z
            .string()
            .describe(
              "Exact verbatim substring from the current LaTeX to replace. Include at least 2-3 full lines of surrounding context (with their newlines) so this string is unique in the document. Copy character-for-character — do not paraphrase."
            ),
          replace: z
            .string()
            .describe(
              "New text to substitute in place of 'find'. Preserve indentation and LaTeX formatting style."
            ),
        })
      )
      .min(1)
      .describe(
        "Targeted find-and-replace edits applied in order. Only include lines that actually change."
      ),
  }),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`edit-latex:${session.user.id}`, 30, 60_000)) {
    return Response.json(
      { error: "Too many requests. Please wait a minute." },
      { status: 429 }
    );
  }

  let instruction: string;
  let latex: string;
  let modelId: string;
  let history: HistoryMessage[];
  let jobDescription: string | undefined;
  let pageCount: number | undefined;

  try {
    const body = await req.json();
    const parsed = requestSchema.parse(body);
    instruction = parsed.instruction;
    latex = parsed.latex;
    modelId = parsed.modelId;
    history = parsed.history;
    jobDescription = parsed.jobDescription;
    pageCount = parsed.pageCount;
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

  const personalInfo = await db.query.personalInformation.findFirst({
    where: eq(personalInformation.userId, session.user.id),
    columns: { aiPreferences: true },
  });

  const modelInstance = resolveModel(modelId);

  const systemParts = [
    "You are an expert LaTeX resume editor who specializes in ATS optimization and making resumes compelling for both automated screening systems and human reviewers.",
    "",
    "Respond in plain conversational text. When the user wants an actual change made to the document, call the editResume tool with targeted find-and-replace edits and briefly note what changed and why (1-2 sentences) in your text response. When the user asks a question or wants a plan, advice, or analysis instead, just answer fully in text — do not call editResume.",
    "",
    "ATS EDITING PRINCIPLES — apply whenever relevant to the instruction:",
    "- Use exact keywords and phrases from the job description; ATS matches on precise strings, not synonyms",
    "- Lead bullet points with strong action verbs: Architected, Engineered, Drove, Reduced, Increased, Delivered, Launched, Optimized, Led, Automated",
    "- Add or preserve quantifiable metrics (%, $, users, time saved, team size) — they signal impact to both ATS and humans",
    "- Use standard section headings (Experience, Education, Skills, Projects, Summary) — non-standard headings confuse ATS parsers",
    "- In Skills sections, list technologies exactly as named in the job description",
    "- Keep bullet points concise: one accomplishment per bullet, metric first or at the end",
    "",
    "When calling editResume, each 'find' must be an exact verbatim copy from the current LaTeX:",
    "- Include at least 2-3 full lines of context around the changed text to guarantee uniqueness",
    "- Include the surrounding newlines so the replacement preserves document structure",
    "- Never paraphrase — copy character-for-character including indentation",
    "",
    "Make minimal, targeted changes — do not rewrite sections that are not changing.",
  ];

  if (personalInfo?.aiPreferences?.trim()) {
    systemParts.push(`\nUser context: ${personalInfo.aiPreferences.trim()}`);
  }

  if (jobDescription?.trim()) {
    systemParts.push(`
Job Description (tailor every edit to maximize keyword overlap and relevance for this specific role):
---
${jobDescription.trim()}
---

CRITICAL RULES:
- NEVER invent or fabricate specific facts (metrics, project names, technologies, companies, dates) not in the resume or provided by the user in this conversation.
- When inserting job description keywords, weave them naturally into existing bullet points — do not keyword-stuff or create awkward sentences.
- Prioritize: inserting required skills/tools from the JD into the Skills section and relevant bullets, strengthening bullet points with impact metrics, aligning terminology to mirror the JD's exact language.`);
  }

  if (pageCount) {
    let overflow: string;
    if (pageCount === 1) {
      overflow = "Fits on one page.";
    } else if (pageCount === 2) {
      overflow =
        "Currently spills onto a second page — prefer tightening existing content (shorter bullets, reduced vspace) over adding new content unless the user explicitly asks to expand.";
    } else {
      overflow = `${pageCount} pages — resume is long, lean toward cutting.`;
    }
    systemParts.push(`\nCompiled page count: ${pageCount}. ${overflow}`);
  }

  // LaTeX in system prompt for provider-level prefix caching
  systemParts.push(`\nCurrent LaTeX resume:\n\`\`\`latex\n${latex}\n\`\`\``);

  const startedAt = performance.now();
  let firstChunkAt: number | null = null;

  try {
    const result = streamText({
      model: modelInstance,
      system: systemParts.join("\n"),
      messages: [...history, { role: "user", content: instruction.trim() }],
      tools: { editResume: editResumeTool },
      onChunk: () => {
        firstChunkAt ??= performance.now();
      },
      onFinish: () => {
        const total = Math.round(performance.now() - startedAt);
        const ttft = Math.round(
          (firstChunkAt ?? performance.now()) - startedAt
        );
        console.log(
          `[edit-latex] ${modelId} first token ${ttft}ms, total ${total}ms`
        );
      },
      onError: (event) => {
        logApiError("[edit-latex]", event.error);
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    logApiError("[edit-latex]", err);
    const errorMessage =
      err instanceof Error ? err.message : "Edit failed. Please try again.";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
