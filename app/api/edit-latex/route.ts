import { generateText, Output } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { personalInformation } from "@/db/schema";
import { auth } from "@/lib/auth";
import { resolveModel } from "@/lib/models";

interface HistoryMessage {
  content: string;
  role: "user" | "assistant";
}

// Partial-edit schema — model only outputs the changed sections, not the full document.
// This cuts output tokens by ~10-20x compared to regenerating the full LaTeX.
const editSchema = z.object({
  explanation: z
    .string()
    .describe("1-2 sentences explaining what was changed and why"),
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
    .describe(
      "Targeted find-and-replace edits applied in order. Only include lines that actually change. Empty array if no LaTeX edits are needed (e.g. a purely informational answer)."
    ),
});

export type EditResult = z.infer<typeof editSchema>;

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let instruction: string;
  let latex: string;
  let modelId: string;
  let history: HistoryMessage[];
  let jobDescription: string | undefined;

  try {
    ({ instruction, latex, modelId, history, jobDescription } =
      await req.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!instruction?.trim()) {
    return Response.json({ error: "Instruction is required" }, { status: 400 });
  }

  const personalInfo = await db.query.personalInformation.findFirst({
    where: eq(personalInformation.userId, session.user.id),
    columns: { aiPreferences: true },
  });

  const modelInstance = resolveModel(modelId);

  const systemParts = [
    "You are an expert LaTeX resume editor.",
    "When making edits:",
    "1. Briefly explain what changed (1-2 sentences).",
    "2. Return ONLY the changed portions as find-and-replace edits — never the full document.",
    "",
    "Each 'find' must be an exact verbatim copy from the current LaTeX:",
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
Job Description (this resume is being customized for this specific role):
---
${jobDescription.trim()}
---

CRITICAL RULES:
- NEVER invent or fabricate specific facts (metrics, project names, technologies, companies) not already in the resume.
- Only use information explicitly present in the resume or provided by the user in this conversation.`);
  }

  // LaTeX in system prompt for provider-level prefix caching
  systemParts.push(`\nCurrent LaTeX resume:\n\`\`\`latex\n${latex}\n\`\`\``);

  try {
    const { output } = await generateText({
      model: modelInstance,
      output: Output.object({
        schema: editSchema,
        name: "ResumeEdits",
        description:
          "Targeted find-and-replace edits to apply to the LaTeX resume",
      }),
      system: systemParts.join("\n"),
      messages: [...history, { role: "user", content: instruction.trim() }],
    });

    return Response.json(output);
  } catch (err) {
    console.error("[edit-latex]", err);
    const errorMessage =
      err instanceof Error ? err.message : "Edit failed. Please try again.";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
