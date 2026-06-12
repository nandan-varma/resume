import { generateText, Output } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { personalInformation } from "@/db/schema";
import { auth } from "@/lib/auth";
import { DEFAULT_MODEL_ID, getModelInstanceById, isValidModelId } from "@/lib/models";

const analysisSchema = z.object({
  match_percentage: z.number().min(0).max(100).describe("Match percentage from 0–100"),
  summary: z.string().describe("2–3 sentence explanation of the match"),
  missing_keywords: z.array(z.string()).describe("Keywords from the job description absent from the resume"),
  improvement_suggestions: z.array(z.string()).describe("Actionable bullet points to improve the match"),
  strengths: z.array(z.string()).describe("Candidate strengths relevant to this role"),
  additional_insights: z.string().nullable().describe("Optional extra advice"),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;

const MAX_JOB_DESCRIPTION_LENGTH = 8000;

async function fetchResumeBase64(userId: string): Promise<string> {
  const info = await db.query.personalInformation.findFirst({
    where: eq(personalInformation.userId, userId),
    columns: { resumeUrl: true },
  });

  if (!info?.resumeUrl) {
    throw new Error("No resume found. Upload your resume on the Resume page first.");
  }

  const response = await fetch(info.resumeUrl);
  if (!response.ok) {
    throw new Error("Could not fetch your resume from storage. Please re-upload it.");
  }

  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString("base64");
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let jobDescription: string;
  let modelId: string;

  try {
    ({ jobDescription, modelId } = await req.json());
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!jobDescription || typeof jobDescription !== "string" || !jobDescription.trim()) {
    return Response.json({ error: "Job description is required" }, { status: 400 });
  }

  const trimmedDescription = jobDescription.trim().slice(0, MAX_JOB_DESCRIPTION_LENGTH);
  const modelInstance = isValidModelId(modelId)
    ? getModelInstanceById(modelId)
    : getModelInstanceById(DEFAULT_MODEL_ID);

  try {
    const resumeBase64 = await fetchResumeBase64(session.user.id);

    const { output } = await generateText({
      model: modelInstance,
      output: Output.object({ schema: analysisSchema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an expert career coach and technical recruiter. Analyze the attached resume against the job description below and provide detailed, actionable feedback.\n\nJob Description:\n${trimmedDescription}`,
            },
            {
              type: "file",
              data: resumeBase64,
              mediaType: "application/pdf",
              filename: "resume.pdf",
            },
          ],
        },
      ],
    });

    return Response.json({ result: output });
  } catch (error) {
    console.error("Analysis error:", error);
    const message =
      error instanceof Error ? error.message : "Analysis failed. Please try again.";
    return Response.json({ error: message }, { status: 500 });
  }
}
