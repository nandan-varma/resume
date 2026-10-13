import { z } from "zod";
import { db } from "@/db/drizzle";
import { analysis, jobs, resumeDocuments } from "@/db/schema";
import { parseJsonBody, requireApiSession } from "@/lib/api-guards";

const analysisSchema = z.object({
  additional_insights: z.string().nullable().optional(),
  improvement_suggestions: z.array(z.string()),
  match_percentage: z.number().min(0).max(100),
  missing_keywords: z.array(z.string()),
  strengths: z.array(z.string()),
  summary: z.string(),
});

const schema = z.object({
  analysis: analysisSchema.optional(),
  jobDescription: z.string().min(1).max(10_000),
  jobTitle: z.string().min(1).max(200),
  link: z.string().url().optional(),
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
    const [created] = await tx
      .insert(jobs)
      .values({ jobDescription, jobTitle, link, userId })
      .returning();

    if (analysisData) {
      await tx.insert(analysis).values({
        additionalInsights: analysisData.additional_insights ?? null,
        improvementSuggestions: analysisData.improvement_suggestions,
        jobId: created.id,
        matchPercentage: analysisData.match_percentage,
        missingKeywords: analysisData.missing_keywords,
        strengths: analysisData.strengths,
        summary: analysisData.summary,
        userId,
      });
      // Placeholder row so isNewJobResume is false on first /editor open
      // (extension-saved jobs already have an analysis, skip consultation)
      await tx.insert(resumeDocuments).values({ jobId: created.id, userId });
    }

    return created;
  });

  return Response.json({ job });
}
