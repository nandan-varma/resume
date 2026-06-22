"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { analysis } from "@/db/schema";
import { getSession } from "./session";

const saveAnalysisSchema = z.object({
  jobId: z.number().positive(),
  match_percentage: z.number().min(0).max(100),
  summary: z.string(),
  strengths: z.array(z.string()),
  missing_keywords: z.array(z.string()),
  improvement_suggestions: z.array(z.string()),
  additional_insights: z.string().nullable().optional(),
});

const getAnalysisByIdSchema = z.object({
  jobId: z.number().positive(),
});

export const saveAnalysis = async (
  jobId: number,
  analysisData: {
    match_percentage: number;
    summary: string;
    strengths: string[];
    missing_keywords: string[];
    improvement_suggestions: string[];
    additional_insights?: string | null;
  }
) => {
  try {
    const parsed = saveAnalysisSchema.safeParse({ jobId, ...analysisData });
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const session = await getSession();
    if (!session?.user.id) {
      return { success: false, message: "Unauthorized" };
    }

    const [result] = await db
      .insert(analysis)
      .values({
        jobId: parsed.data.jobId,
        userId: session.user.id,
        matchPercentage: parsed.data.match_percentage,
        summary: parsed.data.summary,
        strengths: JSON.stringify(parsed.data.strengths),
        missingKeywords: JSON.stringify(parsed.data.missing_keywords),
        improvementSuggestions: JSON.stringify(
          parsed.data.improvement_suggestions
        ),
        additionalInsights: parsed.data.additional_insights ?? null,
      })
      .returning();

    return { success: true, message: "Analysis saved.", analysis: result };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to save analysis.",
    };
  }
};

export const getAnalysisByJobId = async (jobId: number) => {
  try {
    const parsed = getAnalysisByIdSchema.safeParse({ jobId });
    if (!parsed.success) {
      return null;
    }

    const session = await getSession();
    if (!session?.user.id) {
      return null;
    }

    const result = await db.query.analysis.findFirst({
      where: and(
        eq(analysis.jobId, parsed.data.jobId),
        eq(analysis.userId, session.user.id)
      ),
    });

    if (!result) {
      return null;
    }

    return {
      ...result,
      strengths: JSON.parse(result.strengths) as string[],
      missingKeywords: JSON.parse(result.missingKeywords) as string[],
      improvementSuggestions: JSON.parse(
        result.improvementSuggestions
      ) as string[],
    };
  } catch {
    return null;
  }
};
