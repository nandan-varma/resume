import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { hasContent, Resume } from "./resume";
import { matchSkills } from "./skills";
import { getJob } from "./tallo";

/** Everything the job panel shows, for the job page and for the side panel in search. */
export async function jobDetail(userId: string | null, id: string) {
  const job = await getJob(id);
  if (!job) {
    return null;
  }

  const profile = userId
    ? await db.query.profile.findFirst({
        where: eq(schema.profile.userId, userId),
      })
    : undefined;
  const ready = profile ? hasContent(Resume.parse(profile.resume)) : false;
  const existing =
    userId && ready
      ? await db.query.application.findFirst({
          where: and(
            eq(schema.application.userId, userId),
            eq(schema.application.talloId, job.id),
          ),
          columns: { id: true },
        })
      : undefined;

  return {
    job: {
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      workMode: job.workMode,
      pay: job.pay,
      employmentType: job.employmentType,
      department: job.department,
      postedAt: job.postedAt,
      applyUrl: job.applyUrl,
      description: job.description ?? "",
    },
    state: !userId
      ? ("signed-out" as const)
      : ready
        ? ("ready" as const)
        : ("needs-profile" as const),
    resumeId: existing?.id ?? null,
    skills:
      profile && ready && job.description
        ? matchSkills(Resume.parse(profile.resume), job.description)
        : null,
  };
}
export type JobDetail = NonNullable<Awaited<ReturnType<typeof jobDetail>>>;
