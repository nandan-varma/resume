"use server";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/drizzle";
import type { JobStatus } from "@/db/schema";
import { jobs } from "@/db/schema";
import { getSession } from "./session";

export const createJob = async (
  jobTitle: string,
  jobDescription: string,
  link?: string
) => {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return { success: false, message: "Unauthorized" };
    }

    const [job] = await db
      .insert(jobs)
      .values({ jobTitle, jobDescription, link, userId: session.user.id })
      .returning();

    return { success: true, message: "Job created.", job };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create job.",
    };
  }
};

export const getJobs = async () => {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return [];
    }
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
    const session = await getSession();
    if (!session?.user.id) {
      return { success: false, message: "Unauthorized" };
    }

    const [job] = await db
      .update(jobs)
      .set({ status })
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, session.user.id)))
      .returning();

    return { success: true, message: "Status updated.", job };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to update status.",
    };
  }
};

export const deleteJob = async (jobId: number) => {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return { success: false, message: "Unauthorized" };
    }

    await db
      .delete(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, session.user.id)));

    return { success: true, message: "Job deleted." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete job.",
    };
  }
};
