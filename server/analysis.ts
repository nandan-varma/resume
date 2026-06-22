"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { analysis } from "@/db/schema";
import { getSession } from "./session";

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
    const session = await getSession();
    if (!session?.user.id) {
      return { success: false, message: "Unauthorized" };
    }

    const [result] = await db
      .insert(analysis)
      .values({
        jobId,
        userId: session.user.id,
        matchPercentage: analysisData.match_percentage,
        summary: analysisData.summary,
        strengths: JSON.stringify(analysisData.strengths),
        missingKeywords: JSON.stringify(analysisData.missing_keywords),
        improvementSuggestions: JSON.stringify(
          analysisData.improvement_suggestions
        ),
        additionalInsights: analysisData.additional_insights ?? null,
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
    const session = await getSession();
    if (!session?.user.id) {
      return null;
    }

    const result = await db.query.analysis.findFirst({
      where: and(
        eq(analysis.jobId, jobId),
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
