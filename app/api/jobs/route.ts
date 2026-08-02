import { z } from "zod";
import { db } from "@/db/drizzle";
import { analysis, jobs, resumeDocuments } from "@/db/schema";
import { parseJsonBody, requireApiSession } from "@/lib/api-guards";

const analysisSchema = z.object({
  match_percentage: z.number().min(0).max(100),
  summary: z.string(),
  strengths: z.array(z.string()),
  missing_keywords: z.array(z.string()),
  improvement_suggestions: z.array(z.string()),
  additional_insights: z.string().nullable().optional(),
});

const schema = z.object({
  jobTitle: z.string().min(1).max(200),
  jobDescription: z.string().min(1).max(10_000),
  link: z.string().url().optional(),
  analysis: analysisSchema.optional(),
});

export async function POST(req: Request) {
  const auth = await requireApiSession(req);
  if (!auth.ok) {
    return auth.response;
  }
  const { session } = auth.data;

  const parsed = await parseJsonBody(req, schema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const {
    jobTitle,
    jobDescription,
    link,
    analysis: analysisData,
  } = parsed.data;
  const userId = session.user.id;

  const job = await db.transaction(async (tx) => {
    const [job] = await tx
      .insert(jobs)
      .values({ jobTitle, jobDescription, link, userId })
      .returning();

    if (analysisData) {
      await tx.insert(analysis).values({
        jobId: job.id,
        userId,
        matchPercentage: analysisData.match_percentage,
        summary: analysisData.summary,
        strengths: analysisData.strengths,
        missingKeywords: analysisData.missing_keywords,
        improvementSuggestions: analysisData.improvement_suggestions,
        additionalInsights: analysisData.additional_insights ?? null,
      });
      // Placeholder row so isNewJobResume is false on first /editor open
      // (extension-saved jobs already have an analysis, skip consultation)
      await tx.insert(resumeDocuments).values({ jobId: job.id, userId });
    }

    return job;
  });

  return Response.json({ job });
}
