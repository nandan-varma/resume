"use server";

import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/drizzle";
import type { JobStatus } from "@/db/schema";
import { jobStatus, jobs } from "@/db/schema";
import { getSession } from "./session";

const createJobSchema = z.object({
  jobTitle: z.string().min(1, "Job title is required").max(200),
  jobDescription: z.string().min(1, "Job description is required").max(10_000),
  link: z.string().url().optional(),
});

const updateJobStatusSchema = z.object({
  jobId: z.number().positive(),
  status: z.enum(jobStatus),
});


export const createJob = async (
  jobTitle: string,
  jobDescription: string,
  link?: string
) => {
  try {
    const parsed = createJobSchema.safeParse({
      jobTitle,
      jobDescription,
      link,
    });
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

    const { jobTitle: title, jobDescription: desc, link: url } = parsed.data;

    const [job] = await db
      .insert(jobs)
      .values({
        jobTitle: title,
        jobDescription: desc,
        link: url,
        userId: session.user.id,
      })
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
      limit: 200, // ponytail: 200 cap; add cursor pagination when users hit this
    });
  } catch {
    return [];
  }
};

export const updateJobStatus = async (jobId: number, status: JobStatus) => {
  try {
    const parsed = updateJobStatusSchema.safeParse({ jobId, status });
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

    const [job] = await db
      .update(jobs)
      .set({ status: parsed.data.status })
      .where(
        and(eq(jobs.id, parsed.data.jobId), eq(jobs.userId, session.user.id))
      )
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

export const getJobById = async (jobId: number) => {
  try {
    if (!Number.isInteger(jobId) || jobId < 1) return null;

    const session = await getSession();
    if (!session?.user.id) {
      return null;
    }
    return await db.query.jobs.findFirst({
      where: and(eq(jobs.id, jobId), eq(jobs.userId, session.user.id)),
    });
  } catch {
    return null;
  }
};

export const deleteJob = async (jobId: number) => {
  try {
    if (!Number.isInteger(jobId) || jobId < 1) {
      return { success: false, message: "Invalid job ID" };
    }

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
