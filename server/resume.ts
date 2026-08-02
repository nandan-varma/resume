"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { personalInformation } from "@/db/schema";
import { uploadToR2 } from "@/lib/r2";
import { getSession } from "./session";

const saveAiPreferencesSchema = z.object({
  aiPreferences: z.string().max(5000, "Preferences too long"),
});

const savePreferredModelIdSchema = z.object({
  preferredModelId: z.string().max(200),
});

type PersonalInfoUpdate = Partial<{
  resumeUrl: string;
  aiPreferences: string;
  preferredModelId: string;
}>;

async function upsertPersonalInfo(userId: string, update: PersonalInfoUpdate) {
  await db
    .insert(personalInformation)
    .values({ userId, ...update })
    .onConflictDoUpdate({
      target: personalInformation.userId,
      set: update,
    });
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
    // A brand-new user has no row yet (one is only created on first
    // upload/save) — coerce to null since useSuspenseQuery treats an
    // undefined result as an error, not "no data yet".
    const info = await db.query.personalInformation.findFirst({
      where: eq(personalInformation.userId, session.user.id),
    });
    return info ?? null;
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

export const savePreferredModelId = async (preferredModelId: string) => {
  try {
    const parsed = savePreferredModelIdSchema.safeParse({ preferredModelId });
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
      preferredModelId: parsed.data.preferredModelId,
    });
    return { success: true, message: "Model preference saved." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save model.",
    };
  }
};
