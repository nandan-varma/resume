import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import type { Match, Prefs, Resume } from "@/lib/resume";
import type { Suggestion } from "@/lib/suggestions";
import { user } from "./auth-schema";

export * from "./auth-schema";

/** One row per user: their master resume and how they like it written. */
export const profile = sqliteTable("profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  resume: text("resume", { mode: "json" }).$type<Resume>().notNull(),
  prefs: text("prefs", { mode: "json" }).$type<Prefs>().notNull(),
  /** Search ideas from the model, cached against a fingerprint of the resume. */
  suggestions: text("suggestions", { mode: "json" }).$type<{
    key: string;
    searches: Suggestion[];
  }>(),
});

/** A resume tailored to one job posting. One per (user, posting). */
export const application = sqliteTable(
  "application",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    talloId: text("tallo_id").notNull(),
    company: text("company").notNull(),
    role: text("role").notNull(),
    applyUrl: text("apply_url").notNull(),
    match: text("match", { mode: "json" }).$type<Match>().notNull(),
    resume: text("resume", { mode: "json" }).$type<Resume>().notNull(),
    coverLetter: text("cover_letter").notNull(),
    applied: integer("applied", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (t) => [
    uniqueIndex("application_user_job_idx").on(t.userId, t.talloId),
    index("application_user_idx").on(t.userId),
  ],
);
