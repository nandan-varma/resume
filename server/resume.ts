"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import { personalInformation } from "@/db/schema";
import { uploadToR2 } from "@/lib/r2";
import { getSession } from "./session";

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
    const session = await getSession();
    if (!session?.user.id) {
      return { success: false, message: "Unauthorized" };
    }
    await upsertPersonalInfo(session.user.id, { aiPreferences });
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
    const session = await getSession();
    if (!session?.user.id) {
      return { success: false, message: "Unauthorized" };
    }
    await upsertPersonalInfo(session.user.id, { resumeLatex });
    return { success: true, message: "LaTeX saved." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save LaTeX.",
    };
  }
};
