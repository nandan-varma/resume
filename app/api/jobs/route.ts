import { z } from "zod";
import { db } from "@/db/drizzle";
import { analysis, jobResumes, jobs } from "@/db/schema";
import { auth } from "@/lib/auth";

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
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
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
      // Placeholder row so the first autosave can upsert instead of insert
      await tx
        .insert(jobResumes)
        .values({ jobId: job.id, userId, resumeLatex: "" });
    }

    return job;
  });

  return Response.json({ job });
}
