import { generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { personalInformation } from "@/db/schema";
import { auth } from "@/lib/auth";
import { resolveModel } from "@/lib/models";

const analysisSchema = z.object({
  short_title: z
    .string()
    .describe(
      "Very concise job name in 'Role - Company' format, e.g. 'Senior Engineer - Google'. Max 40 chars."
    ),
  match_percentage: z
    .number()
    .min(0)
    .max(100)
    .describe("Match percentage 0–100"),
  summary: z.string().describe("2–3 sentence explanation of the match"),
  missing_keywords: z
    .array(z.string())
    .describe("Keywords from the job description absent from the resume"),
  improvement_suggestions: z
    .array(z.string())
    .describe("Actionable bullet points to improve the match"),
  strengths: z
    .array(z.string())
    .describe("Candidate strengths relevant to this role"),
  additional_insights: z.string().nullable().describe("Optional extra advice"),
});

export type AnalysisResult = z.infer<typeof analysisSchema>;

const MAX_JD_LENGTH = 8000;

async function fetchResumeBase64(userId: string): Promise<string> {
  const info = await db.query.personalInformation.findFirst({
    where: eq(personalInformation.userId, userId),
    columns: { resumeUrl: true },
  });
  if (!info?.resumeUrl) {
    throw new Error(
      "No resume found. Upload your resume on the Resume page first."
    );
  }

  const res = await fetch(info.resumeUrl);
  if (!res.ok) {
    throw new Error(
      "Could not fetch your resume from storage. Please re-upload it."
    );
  }

  return Buffer.from(await res.arrayBuffer()).toString("base64");
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

  if (!jobDescription?.trim()) {
    return Response.json(
      { error: "Job description is required" },
      { status: 400 }
    );
  }

  try {
    const resumeBase64 = await fetchResumeBase64(session.user.id);

    const { object } = await generateObject({
      model: resolveModel(modelId),
      schema: analysisSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an expert career coach. Analyze the attached resume against the job description and provide detailed, actionable feedback.\n\nJob Description:\n${jobDescription.trim().slice(0, MAX_JD_LENGTH)}`,
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

    return Response.json({ result: object });
  } catch (error) {
    console.error("[analyze]", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Analysis failed. Please try again.";
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
