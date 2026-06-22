import { streamText } from "ai";
import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { personalInformation } from "@/db/schema";
import { auth } from "@/lib/auth";
import { resolveModel } from "@/lib/models";

interface HistoryMessage {
  content: string;
  role: "user" | "assistant";
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let instruction: string;
  let latex: string;
  let modelId: string;
  let history: HistoryMessage[];

  try {
    ({ instruction, latex, modelId, history } = await req.json());
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

  // LaTeX is in the system prompt so the stable prefix can be cached by the provider
  // (OpenAI prefix cache activates for prompts > 1024 tokens; Google implicit cache for > 32k)
  const systemParts = [
    "You are an expert LaTeX resume editor.",
    "When the user asks for edits:",
    "1. Briefly explain what you changed (1-2 sentences).",
    "2. Return the COMPLETE updated LaTeX source in a ```latex code block.",
    "Always return the full document — never a partial snippet.",
    "Do not include any other code fences or markdown outside of the latex block.",
  ];

  if (personalInfo?.aiPreferences?.trim()) {
    systemParts.push(`\nUser context: ${personalInfo.aiPreferences.trim()}`);
  }

  systemParts.push(`\nCurrent LaTeX resume:\n\`\`\`latex\n${latex}\n\`\`\``);

  const result = streamText({
    model: modelInstance,
    system: systemParts.join("\n"),
    messages: [...history, { role: "user", content: instruction.trim() }],
  });

  return result.toTextStreamResponse();
}
