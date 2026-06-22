"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { jobResumes, personalInformation } from "@/db/schema";
import { uploadToR2 } from "@/lib/r2";
import { getSession } from "./session";

const saveAiPreferencesSchema = z.object({
  aiPreferences: z.string().max(5000, "Preferences too long"),
});

const saveResumeLatexSchema = z.object({
  resumeLatex: z.string(),
});

const saveJobResumeLatexSchema = z.object({
  jobId: z.number().positive(),
  resumeLatex: z.string(),
});

async function upsertPersonalInfo(
  userId: string,
  update: Partial<{
    resumeUrl: string;
    resumeLatex: string;
    aiPreferences: string;
  }>
) {
  const existing = await db.query.personalInformation.findFirst({
    where: eq(personalInformation.userId, userId),
    columns: { id: true },
  });
  if (existing) {
    await db
      .update(personalInformation)
      .set(update)
      .where(eq(personalInformation.userId, userId));
  } else {
    await db.insert(personalInformation).values({ userId, ...update });
  }
}

export const uploadResume = async (fileBuffer: Buffer, fileName: string) => {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return { success: false, message: "Unauthorized" };
    }

    const resumeUrl = await uploadToR2(fileName, fileBuffer, "application/pdf");
    await upsertPersonalInfo(session.user.id, { resumeUrl });

    return { success: true, message: "Resume uploaded.", resumeUrl };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Upload failed.",
    };
  }
};

export const getPersonalInformation = async () => {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return null;
    }
    return await db.query.personalInformation.findFirst({
      where: eq(personalInformation.userId, session.user.id),
    });
  } catch {
    return null;
  }
};

export const saveAiPreferences = async (aiPreferences: string) => {
  try {
    const parsed = saveAiPreferencesSchema.safeParse({ aiPreferences });
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
    await upsertPersonalInfo(session.user.id, {
      aiPreferences: parsed.data.aiPreferences,
    });
    return { success: true, message: "Preferences saved." };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to save preferences.",
    };
  }
};

export const saveResumeLatex = async (resumeLatex: string) => {
  try {
    const parsed = saveResumeLatexSchema.safeParse({ resumeLatex });
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
    await upsertPersonalInfo(session.user.id, {
      resumeLatex: parsed.data.resumeLatex,
    });
    return { success: true, message: "LaTeX saved." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save LaTeX.",
    };
  }
};

export const getJobResume = async (jobId: number) => {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return null;
    }
    return await db.query.jobResumes.findFirst({
      where: and(
        eq(jobResumes.jobId, jobId),
        eq(jobResumes.userId, session.user.id)
      ),
    });
  } catch {
    return null;
  }
};

export const saveJobResumeLatex = async (
  jobId: number,
  resumeLatex: string
) => {
  try {
    const parsed = saveJobResumeLatexSchema.safeParse({ jobId, resumeLatex });
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

    const existing = await db.query.jobResumes.findFirst({
      where: and(
        eq(jobResumes.jobId, parsed.data.jobId),
        eq(jobResumes.userId, session.user.id)
      ),
      columns: { id: true },
    });

    if (existing) {
      await db
        .update(jobResumes)
        .set({ resumeLatex: parsed.data.resumeLatex })
        .where(
          and(
            eq(jobResumes.jobId, parsed.data.jobId),
            eq(jobResumes.userId, session.user.id)
          )
        );
    } else {
      await db.insert(jobResumes).values({
        jobId: parsed.data.jobId,
        userId: session.user.id,
        resumeLatex: parsed.data.resumeLatex,
      });
    }

    return { success: true, message: "Job resume saved." };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to save job resume.",
    };
  }
};
