"use server";

import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db/drizzle";
import { user, personalInformation, jobs, analysis, resumes } from "@/db/schema";
import { auth } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2";

export const getCurrentUser = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/login");
  }

  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });

  if (!currentUser) {
    redirect("/login");
  }

  return {
    ...session,
    currentUser,
  };
};

export const signIn = async (email: string, password: string) => {
  try {
    await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });

    return {
      success: true,
      message: "Signed in successfully.",
    };
  } catch (error) {
    const e = error as Error;

    return {
      success: false,
      message: e.message || "An unknown error occurred.",
    };
  }
};

export const signUp = async (
  email: string,
  password: string,
  username: string
) => {
  try {
    await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: username,
      },
    });

    return {
      success: true,
      message: "Signed up successfully.",
    };
  } catch (error) {
    const e = error as Error;

    return {
      success: false,
      message: e.message || "An unknown error occurred.",
    };
  }
};

export const getUsers = async () => {
  try {
    const users = await db.query.user.findMany();

    return users;
  } catch (error) {
    console.error(error);
    return [];
  }
};

// Resume Management
export const uploadResume = async (fileBuffer: Buffer, fileName: string) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user.id) {
      return {
        success: false,
        message: "Unauthorized",
      };
    }

    const resumeUrl = await uploadToR2(fileName, fileBuffer, "application/pdf");

    // Update personal information with resume URL
    const existing = await db.query.personalInformation.findFirst({
      where: eq(personalInformation.userId, session.user.id),
    });

    if (existing) {
      await db
        .update(personalInformation)
        .set({ resumeUrl })
        .where(eq(personalInformation.userId, session.user.id));
    } else {
      await db.insert(personalInformation).values({
        userId: session.user.id,
        resumeUrl,
      });
    }

    return {
      success: true,
      message: "Resume uploaded successfully",
      resumeUrl,
    };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: e.message || "Failed to upload resume",
    };
  }
};

export const getPersonalInformation = async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user.id) {
      return null;
    }

    const info = await db.query.personalInformation.findFirst({
      where: eq(personalInformation.userId, session.user.id),
    });

    return info;
  } catch (error) {
    console.error(error);
    return null;
  }
};

// Job Management
export const createJob = async (
  jobTitle: string,
  jobDescription: string,
  link?: string
) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user.id) {
      return {
        success: false,
        message: "Unauthorized",
      };
    }

    const job = await db
      .insert(jobs)
      .values({
        jobTitle,
        jobDescription,
        link,
        userId: session.user.id,
      })
      .returning();

    return {
      success: true,
      message: "Job created successfully",
      job: job[0],
    };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: e.message || "Failed to create job",
    };
  }
};

export const getJobs = async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user.id) {
      return [];
    }

    const userJobs = await db.query.jobs.findMany({
      where: eq(jobs.userId, session.user.id),
    });

    return userJobs;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const updateJobStatus = async (jobId: number, status: string) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user.id) {
      return {
        success: false,
        message: "Unauthorized",
      };
    }

    const result = await db
      .update(jobs)
      .set({ status })
      .where(
        and(eq(jobs.id, jobId), eq(jobs.userId, session.user.id))
      )
      .returning();

    return {
      success: true,
      message: "Job updated successfully",
      job: result[0],
    };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: e.message || "Failed to update job",
    };
  }
};

export const deleteJob = async (jobId: number) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user.id) {
      return {
        success: false,
        message: "Unauthorized",
      };
    }

    await db
      .delete(jobs)
      .where(
        and(eq(jobs.id, jobId), eq(jobs.userId, session.user.id))
      );

    return {
      success: true,
      message: "Job deleted successfully",
    };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: e.message || "Failed to delete job",
    };
  }
};

// Analysis Management
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
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user.id) {
      return {
        success: false,
        message: "Unauthorized",
      };
    }

    const result = await db
      .insert(analysis)
      .values({
        jobId,
        userId: session.user.id,
        matchPercentage: analysisData.match_percentage,
        summary: analysisData.summary,
        strengths: JSON.stringify(analysisData.strengths),
        missingKeywords: JSON.stringify(analysisData.missing_keywords),
        improvementSuggestions: JSON.stringify(analysisData.improvement_suggestions),
        additionalInsights: analysisData.additional_insights || null,
      })
      .returning();

    return {
      success: true,
      message: "Analysis saved successfully",
      analysis: result[0],
    };
  } catch (error) {
    const e = error as Error;
    return {
      success: false,
      message: e.message || "Failed to save analysis",
    };
  }
};

export const getAnalysisByJobId = async (jobId: number) => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user.id) {
      return null;
    }

    const result = await db.query.analysis.findFirst({
      where: and(
        eq(analysis.jobId, jobId),
        eq(analysis.userId, session.user.id)
      ),
    });

    if (result) {
      return {
        ...result,
        strengths: JSON.parse(result.strengths),
        missingKeywords: JSON.parse(result.missingKeywords),
        improvementSuggestions: JSON.parse(result.improvementSuggestions),
      };
    }

    return null;
  } catch (error) {
    console.error(error);
    return null;
  }
}
