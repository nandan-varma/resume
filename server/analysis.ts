"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { analysis } from "@/db/schema";
import { getSession } from "./session";

const saveAnalysisSchema = z.object({
  additional_insights: z.string().nullable().optional(),
  improvement_suggestions: z.array(z.string()),
  jobId: z.number().positive(),
  match_percentage: z.number().min(0).max(100),
  missing_keywords: z.array(z.string()),
  strengths: z.array(z.string()),
  summary: z.string(),
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
        message: parsed.error.issues.map((e) => e.message).join(", "),
        success: false,
      };
    }

    const session = await getSession();
    if (!session?.user.id) {
      return { message: "Unauthorized", success: false };
    }

    const values = {
      additionalInsights: parsed.data.additional_insights ?? null,
      improvementSuggestions: parsed.data.improvement_suggestions,
      jobId: parsed.data.jobId,
      matchPercentage: parsed.data.match_percentage,
      missingKeywords: parsed.data.missing_keywords,
      strengths: parsed.data.strengths,
      summary: parsed.data.summary,
      userId: session.user.id,
    };
    const [result] = await db
      .insert(analysis)
      .values(values)
      .onConflictDoUpdate({
        set: values,
        target: [analysis.jobId, analysis.userId],
      })
      .returning();

    return { analysis: result, message: "Analysis saved.", success: true };
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "Failed to save analysis.",
      success: false,
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

    return result;
  } catch {
    return null;
  }
};
