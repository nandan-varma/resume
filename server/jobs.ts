"use server";

import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/drizzle";
import type { JobStatus } from "@/db/schema";
import { jobStatus, jobs } from "@/db/schema";
import { getSession } from "./session";

const createJobSchema = z.object({
  jobDescription: z.string().min(1, "Job description is required").max(10_000),
  jobTitle: z.string().min(1, "Job title is required").max(200),
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
      jobDescription,
      jobTitle,
      link,
    });
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

    const {
      jobTitle: title,
      jobDescription: description,
      link: url,
    } = parsed.data;

    const [job] = await db
      .insert(jobs)
      .values({
        jobDescription: description,
        jobTitle: title,
        link: url,
        userId: session.user.id,
      })
      .returning();

    return { job, message: "Job created.", success: true };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Failed to create job.",
      success: false,
    };
  }
};

export const getJobs = async () => {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return [];
    }
    const rows = await db.query.jobs.findMany({
      limit: 200, // ponytail: 200 cap; add cursor pagination when users hit this
      orderBy: [desc(jobs.createdAt)],
      where: eq(jobs.userId, session.user.id),
      with: { analysis: true },
    });
    return rows.map((j) => ({
      ...j,
      matchPercentage: j.analysis[0]?.matchPercentage ?? null,
    }));
  } catch {
    return [];
  }
};

export const updateJobStatus = async (jobId: number, status: JobStatus) => {
  try {
    const parsed = updateJobStatusSchema.safeParse({ jobId, status });
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

    const [job] = await db
      .update(jobs)
      .set({ status: parsed.data.status })
      .where(
        and(eq(jobs.id, parsed.data.jobId), eq(jobs.userId, session.user.id))
      )
      .returning();

    return { job, message: "Status updated.", success: true };
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "Failed to update status.",
      success: false,
    };
  }
};

export const getJobById = async (jobId: number) => {
  try {
    if (!Number.isInteger(jobId) || jobId < 1) {
      return null;
    }

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
      return { message: "Invalid job ID", success: false };
    }

    const session = await getSession();
    if (!session?.user.id) {
      return { message: "Unauthorized", success: false };
    }

    await db
      .delete(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.userId, session.user.id)));

    return { message: "Job deleted.", success: true };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Failed to delete job.",
      success: false,
    };
  }
};
