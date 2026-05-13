import { generateText, Output } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { personalInformation } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  DEFAULT_MODEL_ID,
  getModelInstanceById,
  isValidModelId,
} from "@/lib/models";

const analysisSchema = z.object({
  match_percentage: z.number().describe("Match percentage from 0-100"),
  summary: z.string().describe("Short explanation of the match"),
  missing_keywords: z
    .array(z.string())
    .describe("Keywords from job description missing in resume"),
  improvement_suggestions: z
    .array(z.string())
    .describe("Bullet points on what to add or change"),
  strengths: z
    .array(z.string())
    .describe("Strengths the candidate has for this role"),
  additional_insights: z.string().nullable().describe("Optional extra advice"),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;

const resumeCache = new Map<string, string>();

function getAnalysisPrompt(jobDescription: string): string {
  return `You are an expert career coach and technical recruiter. Analyze the attached resume against the following job description and provide detailed, actionable feedback.

Job Description:
${jobDescription}

Please provide your analysis in the structured format requested.`;
}

async function getResumeBase64(userId: string): Promise<string> {
  const cached = resumeCache.get(userId);
  if (cached) {
    return cached;
  }

  // Fetch user's personal information to get resume URL
  const info = await db.query.personalInformation.findFirst({
    where: eq(personalInformation.userId, userId),
  });

  if (!info?.resumeUrl) {
    throw new Error(
      "No resume found. Please upload your resume in the Settings page."
    );
  }

  // Fetch the PDF from the URL
  const response = await fetch(info.resumeUrl);
  if (!response.ok) {
    throw new Error("Failed to fetch resume PDF from storage.");
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  resumeCache.set(userId, base64);
  return base64;
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      jobDescription,
      modelId,
    }: { jobDescription: string; modelId: string } = await req.json();

    if (!jobDescription || typeof jobDescription !== "string") {
      return Response.json(
        { error: "Job description is required" },
        { status: 400 }
      );
    }

    const modelInstance = isValidModelId(modelId)
      ? getModelInstanceById(modelId)
      : getModelInstanceById(DEFAULT_MODEL_ID);

    const resumeBase64 = await getResumeBase64(session.user.id);

    const prompt = getAnalysisPrompt(jobDescription);

    const { output } = await generateText({
      model: modelInstance,
      output: Output.object({
        schema: analysisSchema,
      }),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
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
      error instanceof Error
        ? error.message
        : "Failed to analyze. Please try again.";
    return Response.json({ error: message }, { status: 500 });
  }
}
