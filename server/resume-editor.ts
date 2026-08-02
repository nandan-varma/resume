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
    .values({ userId, jobId })
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
  latex: z.string().max(60_000, "LaTeX too large (max 60 000 chars)"),
  expectedVersion: z.number().int().min(0),
});

export const saveLatex = async (
  jobId: number | null,
  latex: string,
  expectedVersion: number
) => {
  try {
    const parsed = saveLatexSchema.safeParse({ latex, expectedVersion });
    if (!parsed.success) {
      return {
        success: false as const,
        message: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const session = await getSession();
    if (!session?.user.id) {
      return { success: false as const, message: "Unauthorized" };
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
        success: false as const,
        conflict: true as const,
        message: "This resume was edited elsewhere — reload to continue.",
      };
    }
    return { success: true as const, document: row };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to save.",
    };
  }
};

const messageInputSchema = z.object({
  role: z.enum(resumeMessageRole),
  content: z.string().max(20_000).default(""),
  editsApplied: z.number().int().min(0).optional(),
  questionKey: z.string().max(200).optional(),
  questionOptions: z.array(z.string().max(200)).max(20).optional(),
  questionAnswered: z.string().max(500).optional(),
});

const appendTurnSchema = z.object({
  messages: z.array(messageInputSchema).min(1).max(10),
  latexUpdate: z
    .object({
      latex: z.string().max(60_000, "LaTeX too large (max 60 000 chars)"),
      expectedVersion: z.number().int().min(0),
    })
    .optional(),
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
        success: false as const,
        message: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }

    const session = await getSession();
    if (!session?.user.id) {
      return { success: false as const, message: "Unauthorized" };
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
            documentId: doc.id,
            role: m.role,
            content: m.content,
            editsApplied: m.editsApplied,
            questionKey: m.questionKey,
            questionOptions: m.questionOptions,
            questionAnswered: m.questionAnswered,
            revisionId:
              (m.role === "assistant" || m.role === "notice") && revisionId
                ? revisionId
                : undefined,
          }))
        )
        .returning();

      return { document: updatedDoc, messages };
    });

    return { success: true as const, ...result };
  } catch (error) {
    if (error instanceof VersionConflictError) {
      return {
        success: false as const,
        conflict: true as const,
        message: "This resume was edited elsewhere — reload to continue.",
      };
    }
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to save.",
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
      return { success: false as const, message: "Unauthorized" };
    }

    const doc = await findOrCreateDocument(session.user.id, jobId);
    const revision = await db.query.resumeRevisions.findFirst({
      where: and(
        eq(resumeRevisions.id, revisionId),
        eq(resumeRevisions.documentId, doc.id)
      ),
    });
    if (!revision) {
      return { success: false as const, message: "Revision not found." };
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

      // The restored state becomes its own checkpoint, so restoring from a
      // restore keeps working — nothing is ever deleted.
      const [newRevision] = await tx
        .insert(resumeRevisions)
        .values({ documentId: doc.id, resumeLatex: revision.resumeLatex })
        .returning();
      const [message] = await tx
        .insert(resumeMessages)
        .values({
          documentId: doc.id,
          role: "notice",
          content: "Restored to an earlier version.",
          revisionId: newRevision.id,
        })
        .returning();

      return { document: row, message };
    });

    return { success: true as const, ...result };
  } catch (error) {
    if (error instanceof VersionConflictError) {
      return {
        success: false as const,
        conflict: true as const,
        message: "This resume was edited elsewhere — reload to continue.",
      };
    }
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Restore failed.",
    };
  }
};

export const clearMessages = async (jobId: number | null) => {
  try {
    const session = await getSession();
    if (!session?.user.id) {
      return { success: false as const, message: "Unauthorized" };
    }
    const doc = await findOrCreateDocument(session.user.id, jobId);
    await db
      .delete(resumeMessages)
      .where(eq(resumeMessages.documentId, doc.id));
    return { success: true as const };
  } catch (error) {
    return {
      success: false as const,
      message: error instanceof Error ? error.message : "Failed to clear chat.",
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
        success: false as const,
        message: parsed.error.issues.map((e) => e.message).join(", "),
      };
    }
    const session = await getSession();
    if (!session?.user.id) {
      return { success: false as const, message: "Unauthorized" };
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
      return { success: false as const, message: "Question not found." };
    }
    return { success: true as const, message: row };
  } catch (error) {
    return {
      success: false as const,
      message:
        error instanceof Error ? error.message : "Failed to save answer.",
    };
  }
};
