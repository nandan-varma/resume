import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { and, desc, eq } from "drizzle-orm";
import { extractText, getDocumentProxy } from "unpdf";
import { db, schema } from "@/db";
import { resumeFromText, suggestSearches, tailorResume } from "@/lib/ai";
import { jobDetail } from "@/lib/job-detail";
import {
  defaultPrefs,
  emptyResume,
  hasContent,
  Prefs,
  Resume,
} from "@/lib/resume";
import { fingerprint } from "@/lib/suggestions";
import { getJob } from "@/lib/tallo";

const MAX_PDF_BYTES = 5 * 1024 * 1024;

const requireUser = (locals: App.Locals) => {
  if (!locals.user) {
    throw new ActionError({
      code: "UNAUTHORIZED",
      message: "Please sign in first.",
    });
  }
  return locals.user;
};

const getProfile = (userId: string) =>
  db.query.profile.findFirst({ where: eq(schema.profile.userId, userId) });

const saveProfile = (
  userId: string,
  values: Partial<{ resume: Resume; prefs: Prefs }>,
) =>
  db
    .insert(schema.profile)
    .values({ userId, resume: emptyResume(), prefs: defaultPrefs(), ...values })
    .onConflictDoUpdate({ target: schema.profile.userId, set: values });

const ownedApplication = (userId: string, id: string) =>
  and(eq(schema.application.id, id), eq(schema.application.userId, userId));

export const server = {
  /** Read an uploaded PDF and turn it into a structured resume. */
  importResume: defineAction({
    accept: "form",
    input: z.object({
      file: z
        .instanceof(File)
        .refine((f) => f.type === "application/pdf", "Please upload a PDF.")
        .refine((f) => f.size <= MAX_PDF_BYTES, "That file is over 5 MB."),
    }),
    handler: async ({ file }, { locals }) => {
      const user = requireUser(locals);
      const pdf = await getDocumentProxy(
        new Uint8Array(await file.arrayBuffer()),
      );
      const { text } = await extractText(pdf, { mergePages: true });
      if (text.trim().length < 50) {
        throw new ActionError({
          code: "BAD_REQUEST",
          message: "We couldn't read any text in that PDF. Is it a scan?",
        });
      }
      const resume = await resumeFromText(text);
      await saveProfile(user.id, { resume });
      return resume;
    },
  }),

  /** Read pasted resume text and turn it into a structured resume. */
  importResumeText: defineAction({
    input: z.object({
      text: z.string().trim().min(50, "Paste a bit more.").max(40_000),
    }),
    handler: async ({ text }, { locals }) => {
      const user = requireUser(locals);
      const resume = await resumeFromText(text);
      await saveProfile(user.id, { resume });
      return resume;
    },
  }),

  saveResume: defineAction({
    input: z.object({ resume: Resume }),
    handler: async ({ resume }, { locals }) => {
      await saveProfile(requireUser(locals).id, { resume });
    },
  }),

  /** Search ideas for the signed-in user, cached until their resume changes. */
  suggestedSearches: defineAction({
    input: z.object({ refresh: z.boolean().default(false) }),
    handler: async ({ refresh }, { locals }) => {
      const user = requireUser(locals);
      const profile = await getProfile(user.id);
      const resume = Resume.parse(profile?.resume ?? {});
      if (!(profile && hasContent(resume))) {
        return [];
      }

      const key = await fingerprint(resume);
      if (!refresh && profile.suggestions?.key === key) {
        return profile.suggestions.searches;
      }
      const searches = await suggestSearches(resume);
      await db
        .update(schema.profile)
        .set({ suggestions: { key, searches } })
        .where(eq(schema.profile.userId, user.id));
      return searches;
    },
  }),

  savePrefs: defineAction({
    input: z.object({ prefs: Prefs }),
    handler: async ({ prefs }, { locals }) => {
      await saveProfile(requireUser(locals).id, { prefs });
    },
  }),

  /** The job panel for the search page's side view. */
  jobDetail: defineAction({
    input: z.object({ id: z.string().min(1) }),
    handler: async ({ id }, { locals }) => {
      const detail = await jobDetail(locals.user?.id ?? null, id);
      if (!detail) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "This job is no longer listed.",
        });
      }
      return detail;
    },
  }),

  /** Short list of the user's resumes, for quick jump. */
  listResumes: defineAction({
    handler: async (_input, { locals }) => {
      const user = requireUser(locals);
      return db.query.application.findMany({
        where: eq(schema.application.userId, user.id),
        columns: { id: true, role: true, company: true },
        orderBy: desc(schema.application.createdAt),
        limit: 50,
      });
    },
  }),

  /** Match the profile against a posting and write a tailored resume and letter. */
  tailor: defineAction({
    input: z.object({
      talloId: z.string().min(1),
      shorter: z.boolean().default(false),
    }),
    handler: async ({ talloId, shorter }, { locals }) => {
      const user = requireUser(locals);
      const profile = await getProfile(user.id);
      if (!(profile && hasContent(profile.resume))) {
        throw new ActionError({
          code: "PRECONDITION_FAILED",
          message: "Add your details first.",
        });
      }
      const job = await getJob(talloId);
      if (!job?.description) {
        throw new ActionError({
          code: "NOT_FOUND",
          message: "This job is no longer listed.",
        });
      }

      const tailored = await tailorResume({
        posting: {
          title: job.title,
          company: job.company,
          description: job.description,
        },
        resume: Resume.parse(profile.resume),
        prefs: Prefs.parse(profile.prefs),
        shorter,
      });
      const { match, resume, coverLetter } = tailored;

      const fields = {
        company: job.company,
        role: job.title,
        applyUrl: job.applyUrl ?? "",
        match,
        resume,
        coverLetter,
      };
      const [row] = await db
        .insert(schema.application)
        .values({
          id: crypto.randomUUID(),
          userId: user.id,
          talloId,
          ...fields,
        })
        .onConflictDoUpdate({
          target: [schema.application.userId, schema.application.talloId],
          set: fields,
        })
        .returning({ id: schema.application.id });
      return { id: row.id };
    },
  }),

  saveApplication: defineAction({
    input: z.object({
      id: z.string(),
      resume: Resume,
      coverLetter: z.string(),
    }),
    handler: async ({ id, resume, coverLetter }, { locals }) => {
      const user = requireUser(locals);
      await db
        .update(schema.application)
        .set({ resume, coverLetter })
        .where(ownedApplication(user.id, id));
    },
  }),

  setApplied: defineAction({
    input: z.object({ id: z.string(), applied: z.boolean() }),
    handler: async ({ id, applied }, { locals }) => {
      const user = requireUser(locals);
      await db
        .update(schema.application)
        .set({ applied })
        .where(ownedApplication(user.id, id));
    },
  }),

  deleteApplication: defineAction({
    input: z.object({ id: z.string() }),
    handler: async ({ id }, { locals }) => {
      const user = requireUser(locals);
      await db.delete(schema.application).where(ownedApplication(user.id, id));
    },
  }),
};
