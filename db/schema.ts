import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  id: text("id").primaryKey(),
  image: text("image"),
  name: text("name").notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const jobStatus = [
  "submitted",
  "waiting for response",
  "rejected",
  "interview",
  "offer",
  "accepted",
  "withdrawn",
] as const;

export type JobStatus = (typeof jobStatus)[number];

export const jobs = pgTable(
  "jobs",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: serial("id").primaryKey(),
    jobDescription: text("job_description").notNull(),
    jobTitle: text("job_title").notNull(),
    link: text("link"),
    status: text("status")
      .$type<JobStatus>()
      .notNull()
      .default("waiting for response"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("jobs_userId_idx").on(table.userId)]
);

export const personalInformation = pgTable(
  "personal_information",
  {
    aiPreferences: text("ai_preferences"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: serial("id").primaryKey(),
    preferredModelId: text("preferred_model_id"),
    resumeUrl: text("resume_url"),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("personalInformation_userId_idx").on(table.userId)]
);

export const session = pgTable(
  "session",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    id: text("id").primaryKey(),
    ipAddress: text("ip_address"),
    token: text("token").notNull().unique(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = pgTable(
  "account",
  {
    accessToken: text("access_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    accountId: text("account_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: text("id").primaryKey(),
    idToken: text("id_token"),
    password: text("password"),
    providerId: text("provider_id").notNull(),
    refreshToken: text("refresh_token"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    value: text("value").notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const analysis = pgTable(
  "analysis",
  {
    additionalInsights: text("additional_insights"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: serial("id").primaryKey(),
    improvementSuggestions: jsonb("improvement_suggestions")
      .$type<string[]>()
      .notNull()
      .default([]),
    jobId: integer("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    matchPercentage: integer("match_percentage").notNull(),
    missingKeywords: jsonb("missing_keywords")
      .$type<string[]>()
      .notNull()
      .default([]),
    strengths: jsonb("strengths").$type<string[]>().notNull().default([]),
    summary: text("summary").notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("analysis_jobId_idx").on(table.jobId),
    index("analysis_userId_idx").on(table.userId),
    uniqueIndex("analysis_jobId_userId_unique").on(table.jobId, table.userId),
  ]
);

export const userRelations = relations(user, ({ many }) => ({
  accounts: many(account),
  analysis: many(analysis),
  jobs: many(jobs),
  personalInformation: many(personalInformation),
  resumeDocuments: many(resumeDocuments),
  sessions: many(session),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  analysis: many(analysis),
  resumeDocuments: many(resumeDocuments),
  user: one(user, {
    fields: [jobs.userId],
    references: [user.id],
  }),
}));

export const personalInformationRelations = relations(
  personalInformation,
  ({ one }) => ({
    user: one(user, {
      fields: [personalInformation.userId],
      references: [user.id],
    }),
  })
);

export const analysisRelations = relations(analysis, ({ one }) => ({
  job: one(jobs, {
    fields: [analysis.jobId],
    references: [jobs.id],
  }),
  user: one(user, {
    fields: [analysis.userId],
    references: [user.id],
  }),
}));

// jobId null = the user's global resume; non-null = a per-job variant.
// Partial unique indexes give "one global doc per user" and "one doc per
// (user, job)" without a discriminator column.
export const resumeDocuments = pgTable(
  "resume_documents",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    id: serial("id").primaryKey(),
    jobId: integer("job_id").references(() => jobs.id, {
      onDelete: "cascade",
    }),
    resumeLatex: text("resume_latex").notNull().default(""),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(0),
  },
  (table) => [
    index("resume_documents_userId_idx").on(table.userId),
    uniqueIndex("resume_documents_global_unique")
      .on(table.userId)
      .where(sql`${table.jobId} IS NULL`),
    uniqueIndex("resume_documents_job_unique")
      .on(table.userId, table.jobId)
      .where(sql`${table.jobId} IS NOT NULL`),
  ]
);

// One row per AI-applied edit or restore — never per keystroke. Manual typing
// autosaves straight to resumeDocuments.resumeLatex with no revision row.
export const resumeRevisions = pgTable(
  "resume_revisions",
  {
    createdAt: timestamp("created_at").defaultNow().notNull(),
    documentId: integer("document_id")
      .notNull()
      .references(() => resumeDocuments.id, { onDelete: "cascade" }),
    id: serial("id").primaryKey(),
    resumeLatex: text("resume_latex").notNull(),
  },
  (table) => [index("resume_revisions_documentId_idx").on(table.documentId)]
);

export const resumeMessageRole = [
  "user",
  "assistant",
  "notice",
  "question",
] as const;

export type ResumeMessageRole = (typeof resumeMessageRole)[number];

export const resumeMessages = pgTable(
  "resume_messages",
  {
    content: text("content").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    documentId: integer("document_id")
      .notNull()
      .references(() => resumeDocuments.id, { onDelete: "cascade" }),
    editsApplied: integer("edits_applied"),
    id: serial("id").primaryKey(),
    questionAnswered: text("question_answered"),
    questionKey: text("question_key"),
    questionOptions: jsonb("question_options").$type<string[]>(),
    revisionId: integer("revision_id").references(() => resumeRevisions.id),
    role: text("role").$type<ResumeMessageRole>().notNull(),
  },
  (table) => [index("resume_messages_documentId_idx").on(table.documentId)]
);

export const resumeDocumentsRelations = relations(
  resumeDocuments,
  ({ one, many }) => ({
    job: one(jobs, { fields: [resumeDocuments.jobId], references: [jobs.id] }),
    messages: many(resumeMessages),
    revisions: many(resumeRevisions),
    user: one(user, {
      fields: [resumeDocuments.userId],
      references: [user.id],
    }),
  })
);

export const resumeRevisionsRelations = relations(
  resumeRevisions,
  ({ one, many }) => ({
    document: one(resumeDocuments, {
      fields: [resumeRevisions.documentId],
      references: [resumeDocuments.id],
    }),
    messages: many(resumeMessages),
  })
);

export const resumeMessagesRelations = relations(resumeMessages, ({ one }) => ({
  document: one(resumeDocuments, {
    fields: [resumeMessages.documentId],
    references: [resumeDocuments.id],
  }),
  revision: one(resumeRevisions, {
    fields: [resumeMessages.revisionId],
    references: [resumeRevisions.id],
  }),
}));

export type Job = typeof jobs.$inferSelect;

export const schema = {
  account,
  accountRelations,
  analysis,
  analysisRelations,
  jobs,
  jobsRelations,
  personalInformation,
  personalInformationRelations,
  resumeDocuments,
  resumeDocumentsRelations,
  resumeMessages,
  resumeMessagesRelations,
  resumeRevisions,
  resumeRevisionsRelations,
  session,
  sessionRelations,
  user,
  userRelations,
  verification,
};
