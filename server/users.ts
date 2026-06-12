"use server";

import { eq, and, desc } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/drizzle";
import { user, personalInformation, jobs, analysis } from "@/db/schema";
import type { JobStatus } from "@/db/schema";
import { auth } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2";

async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });
  if (!currentUser) redirect("/login");
  return { session, currentUser };
}

export const getCurrentUser = async () => {
  const { session, currentUser } = await requireSession();
  return { ...session, currentUser };
};

export const signIn = async (email: string, password: string) => {
  try {
    await auth.api.signInEmail({ body: { email, password } });
    return { success: true, message: "Signed in successfully." };
  } catch (error) {
    const e = error as Error;
    return { success: false, message: e.message || "Sign in failed." };
  }
};

export const signUp = async (email: string, password: string, username: string) => {
  try {
    await auth.api.signUpEmail({ body: { email, password, name: username } });
    return { success: true, message: "Account created." };
  } catch (error) {
    const e = error as Error;
    return { success: false, message: e.message || "Sign up failed." };
  }
};

// ── Resume ────────────────────────────────────────────────────────────────────

export const uploadResume = async (fileBuffer: Buffer, fileName: string) => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user.id) return { success: false, message: "Unauthorized" };

    const resumeUrl = await uploadToR2(fileName, fileBuffer, "application/pdf");

    const existing = await db.query.personalInformation.findFirst({
      where: eq(personalInformation.userId, session.user.id),
    });

    if (existing) {
      await db
        .update(personalInformation)
        .set({ resumeUrl })
        .where(eq(personalInformation.userId, session.user.id));
    } else {
      await db.insert(personalInformation).values({ userId: session.user.id, resumeUrl });
    }

    return { success: true, message: "Resume uploaded.", resumeUrl };
  } catch (error) {
    const e = error as Error;
    return { success: false, message: e.message || "Upload failed." };
  }
};

export const getPersonalInformation = async () => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user.id) return null;
    return await db.query.personalInformation.findFirst({
      where: eq(personalInformation.userId, session.user.id),
    });
  } catch {
    return null;
  }
};

export const saveAiPreferences = async (aiPreferences: string) => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user.id) return { success: false, message: "Unauthorized" };

    const existing = await db.query.personalInformation.findFirst({
      where: eq(personalInformation.userId, session.user.id),
    });

    if (existing) {
      await db
        .update(personalInformation)
        .set({ aiPreferences })
        .where(eq(personalInformation.userId, session.user.id));
    } else {
      await db.insert(personalInformation).values({ userId: session.user.id, aiPreferences });
    }

    return { success: true, message: "Preferences saved." };
  } catch (error) {
    const e = error as Error;
    return { success: false, message: e.message || "Failed to save preferences." };
  }
};

export const saveResumeLatex = async (resumeLatex: string) => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user.id) return { success: false, message: "Unauthorized" };

    const existing = await db.query.personalInformation.findFirst({
      where: eq(personalInformation.userId, session.user.id),
    });

    if (existing) {
      await db
        .update(personalInformation)
        .set({ resumeLatex })
        .where(eq(personalInformation.userId, session.user.id));
    } else {
      await db.insert(personalInformation).values({ userId: session.user.id, resumeLatex });
    }

    return { success: true, message: "LaTeX saved." };
  } catch (error) {
    const e = error as Error;
    return { success: false, message: e.message || "Failed to save LaTeX." };
  }
};

// ── Jobs ─────────────────────────────────────────────────────────────────────

export const createJob = async (
  jobTitle: string,
  jobDescription: string,
  link?: string
) => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user.id) return { success: false, message: "Unauthorized" };

    const [job] = await db
      .insert(jobs)
      .values({ jobTitle, jobDescription, link, userId: session.user.id })
      .returning();

    return { success: true, message: "Job created.", job };
  } catch (error) {
    const e = error as Error;
    return { success: false, message: e.message || "Failed to create job." };
  }
};

export const getJobs = async () => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user.id) return [];
    return await db.query.jobs.findMany({
      where: eq(jobs.userId, session.user.id),
      orderBy: [desc(jobs.createdAt)],
    });
  } catch {
    return [];
  }
};

export const updateJobStatus = async (jobId: number, status: JobStatus) => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user.id) return { success: false, message: "Unauthorized" };

    const [job] = await db
      .update(jobs)
      .set({ status })
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, session.user.id)))
      .returning();

    return { success: true, message: "Status updated.", job };
  } catch (error) {
    const e = error as Error;
    return { success: false, message: e.message || "Failed to update status." };
  }
};

export const deleteJob = async (jobId: number) => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user.id) return { success: false, message: "Unauthorized" };

    await db
      .delete(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, session.user.id)));

    return { success: true, message: "Job deleted." };
  } catch (error) {
    const e = error as Error;
    return { success: false, message: e.message || "Failed to delete job." };
  }
};

// ── Analysis ──────────────────────────────────────────────────────────────────

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
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user.id) return { success: false, message: "Unauthorized" };

    const [result] = await db
      .insert(analysis)
      .values({
        jobId,
        userId: session.user.id,
        matchPercentage: analysisData.match_percentage,
        summary: analysisData.summary,
        strengths: JSON.stringify(analysisData.strengths),
        missingKeywords: JSON.stringify(analysisData.missing_keywords),
        improvementSuggestions: JSON.stringify(analysisData.improvement_suggestions),
        additionalInsights: analysisData.additional_insights ?? null,
      })
      .returning();

    return { success: true, message: "Analysis saved.", analysis: result };
  } catch (error) {
    const e = error as Error;
    return { success: false, message: e.message || "Failed to save analysis." };
  }
};

export const getAnalysisByJobId = async (jobId: number) => {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user.id) return null;

    const result = await db.query.analysis.findFirst({
      where: and(
        eq(analysis.jobId, jobId),
        eq(analysis.userId, session.user.id)
      ),
    });

    if (!result) return null;

    return {
      ...result,
      strengths: JSON.parse(result.strengths) as string[],
      missingKeywords: JSON.parse(result.missingKeywords) as string[],
      improvementSuggestions: JSON.parse(result.improvementSuggestions) as string[],
    };
  } catch {
    return null;
  }
};
