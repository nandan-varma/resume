"use server";

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/drizzle";
import {
  resumeDocuments,
  resumeMessageRole,
  resumeMessages,
  resumeRevisions,
} from "@/db/schema";
import { getSession } from "./session";

class VersionConflictError extends Error {}

function documentWhere(userId: string, jobId: number | null) {
  return jobId === null
    ? and(eq(resumeDocuments.userId, userId), isNull(resumeDocuments.jobId))
    : and(eq(resumeDocuments.userId, userId), eq(resumeDocuments.jobId, jobId));
}

// Documents are created lazily on first write — a pristine editor has no row
// yet, and its version (0) matches the default a fresh row gets here, so the
// caller's optimistic-concurrency check works the same for "brand new" and
// "existing" documents.
async function findOrCreateDocument(userId: string, jobId: number | null) {
  const where = documentWhere(userId, jobId);
  const existing = await db.query.resumeDocuments.findFirst({ where });
  if (existing) {
    return existing;
  }
  const [created] = await db
    .insert(resumeDocuments)
    .values({ jobId, userId })
    .onConflictDoNothing()
    .returning();
  if (created) {
    return created;
  }
  // Lost a create race to a concurrent request — the row exists now.
  const row = await db.query.resumeDocuments.findFirst({ where });
  if (!row) {
    throw new Error("Failed to load resume document");
  }
  return row;
}

export const getResumeDocument = async (jobId: number | null) => {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return null;
    }
    const doc = await db.query.resumeDocuments.findFirst({
      where: documentWhere(session.user.id, jobId),
      with: { messages: { orderBy: asc(resumeMessages.createdAt) } },
    });
    return doc ?? null;
  } catch {
    return null;
  }
};

const saveLatexSchema = z.object({
  expectedVersion: z.number().int().min(0),
  latex: z.string().max(60_000, "LaTeX too large (max 60 000 chars)"),
});

export const saveLatex = async (
  jobId: number | null,
  latex: string,
  expectedVersion: number
) => {
  try {
    const parsed = saveLatexSchema.safeParse({ expectedVersion, latex });
    if (!parsed.success) {
      return {
        message: parsed.error.issues.map((e) => e.message).join(", "),
        success: false as const,
      };
    }

    const session = await getSession();
    if (!session?.user.id) {
      return { message: "Unauthorized", success: false as const };
    }

    const doc = await findOrCreateDocument(session.user.id, jobId);
    const [row] = await db
      .update(resumeDocuments)
      .set({
        resumeLatex: parsed.data.latex,
        version: sql`${resumeDocuments.version} + 1`,
      })
      .where(
        and(
          eq(resumeDocuments.id, doc.id),
          eq(resumeDocuments.version, parsed.data.expectedVersion)
        )
      )
      .returning();

    if (!row) {
      return {
        conflict: true as const,
        message: "This resume was edited elsewhere — reload to continue.",
        success: false as const,
      };
    }
    return { document: row, success: true as const };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Failed to save.",
      success: false as const,
    };
  }
};

const messageInputSchema = z.object({
  content: z.string().max(20_000).default(""),
  editsApplied: z.number().int().min(0).optional(),
  questionAnswered: z.string().max(500).optional(),
  questionKey: z.string().max(200).optional(),
  questionOptions: z.array(z.string().max(200)).max(20).optional(),
  role: z.enum(resumeMessageRole),
});

const appendTurnSchema = z.object({
  latexUpdate: z
    .object({
      expectedVersion: z.number().int().min(0),
      latex: z.string().max(60_000, "LaTeX too large (max 60 000 chars)"),
    })
    .optional(),
  messages: z.array(messageInputSchema).min(1).max(10),
});

type AppendTurnInput = z.infer<typeof appendTurnSchema>;

// The single write per chat turn: optionally bump the document's latex
// (version-checked, recorded as a revision) and append every message in one
// transaction — an append-only log, never a bulk overwrite of prior history.
export const appendTurn = async (
  jobId: number | null,
  input: AppendTurnInput
) => {
  try {
    const parsed = appendTurnSchema.safeParse(input);
    if (!parsed.success) {
      return {
        message: parsed.error.issues.map((e) => e.message).join(", "),
        success: false as const,
      };
    }

    const session = await getSession();
    if (!session?.user.id) {
      return { message: "Unauthorized", success: false as const };
    }

    const doc = await findOrCreateDocument(session.user.id, jobId);

    const result = await db.transaction(async (tx) => {
      let updatedDoc = doc;
      let revisionId: number | undefined;

      if (parsed.data.latexUpdate) {
        const { latex, expectedVersion } = parsed.data.latexUpdate;
        const [row] = await tx
          .update(resumeDocuments)
          .set({
            resumeLatex: latex,
            version: sql`${resumeDocuments.version} + 1`,
          })
          .where(
            and(
              eq(resumeDocuments.id, doc.id),
              eq(resumeDocuments.version, expectedVersion)
            )
          )
          .returning();
        if (!row) {
          throw new VersionConflictError();
        }
        updatedDoc = row;
        const [revision] = await tx
          .insert(resumeRevisions)
          .values({ documentId: doc.id, resumeLatex: latex })
          .returning();
        revisionId = revision.id;
      }

      const messages = await tx
        .insert(resumeMessages)
        .values(
          parsed.data.messages.map((m) => ({
            content: m.content,
            documentId: doc.id,
            editsApplied: m.editsApplied,
            questionAnswered: m.questionAnswered,
            questionKey: m.questionKey,
            questionOptions: m.questionOptions,
            revisionId:
              (m.role === "assistant" || m.role === "notice") && revisionId
                ? revisionId
                : undefined,
            role: m.role,
          }))
        )
        .returning();

      return { document: updatedDoc, messages };
    });

    return { success: true as const, ...result };
  } catch (error) {
    if (error instanceof VersionConflictError) {
      return {
        conflict: true as const,
        message: "This resume was edited elsewhere — reload to continue.",
        success: false as const,
      };
    }
    return {
      message: error instanceof Error ? error.message : "Failed to save.",
      success: false as const,
    };
  }
};

export const restoreRevision = async (
  jobId: number | null,
  revisionId: number,
  expectedVersion: number
) => {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return { message: "Unauthorized", success: false as const };
    }

    const doc = await findOrCreateDocument(session.user.id, jobId);
    const revision = await db.query.resumeRevisions.findFirst({
      where: and(
        eq(resumeRevisions.id, revisionId),
        eq(resumeRevisions.documentId, doc.id)
      ),
    });
    if (!revision) {
      return { message: "Revision not found.", success: false as const };
    }

    const result = await db.transaction(async (tx) => {
      const [row] = await tx
        .update(resumeDocuments)
        .set({
          resumeLatex: revision.resumeLatex,
          version: sql`${resumeDocuments.version} + 1`,
        })
        .where(
          and(
            eq(resumeDocuments.id, doc.id),
            eq(resumeDocuments.version, expectedVersion)
          )
        )
        .returning();
      if (!row) {
        throw new VersionConflictError();
      }

      // Restoring re-points current state at the existing revision rather
      // than creating a new one, so the version list doesn't keep growing
      // every time you restore — it just shows which past version you're on.
      const [message] = await tx
        .insert(resumeMessages)
        .values({
          content: "Restored to an earlier version.",
          documentId: doc.id,
          revisionId: revision.id,
          role: "notice",
        })
        .returning();

      return { document: row, message };
    });

    return { success: true as const, ...result };
  } catch (error) {
    if (error instanceof VersionConflictError) {
      return {
        conflict: true as const,
        message: "This resume was edited elsewhere — reload to continue.",
        success: false as const,
      };
    }
    return {
      message: error instanceof Error ? error.message : "Restore failed.",
      success: false as const,
    };
  }
};

export const clearMessages = async (jobId: number | null) => {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return { message: "Unauthorized", success: false as const };
    }
    const doc = await findOrCreateDocument(session.user.id, jobId);
    await db
      .delete(resumeMessages)
      .where(eq(resumeMessages.documentId, doc.id));
    return { success: true as const };
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : "Failed to clear chat.",
      success: false as const,
    };
  }
};

const answerQuestionSchema = z.object({ answer: z.string().max(500) });

// Consultation "question" messages are inserted once, then marked answered
// in place — the only in-place edit in an otherwise append-only log.
export const answerQuestion = async (
  jobId: number | null,
  messageId: number,
  answer: string
) => {
  try {
    const parsed = answerQuestionSchema.safeParse({ answer });
    if (!parsed.success) {
      return {
        message: parsed.error.issues.map((e) => e.message).join(", "),
        success: false as const,
      };
    }
    const session = await getSession();
    if (!session?.user.id) {
      return { message: "Unauthorized", success: false as const };
    }
    const doc = await findOrCreateDocument(session.user.id, jobId);
    const [row] = await db
      .update(resumeMessages)
      .set({ questionAnswered: parsed.data.answer })
      .where(
        and(
          eq(resumeMessages.id, messageId),
          eq(resumeMessages.documentId, doc.id)
        )
      )
      .returning();
    if (!row) {
      return { message: "Question not found.", success: false as const };
    }
    return { message: row, success: true as const };
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "Failed to save answer.",
      success: false as const,
    };
  }
};
