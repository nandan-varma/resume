import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
    id: serial("id").primaryKey(),
    jobTitle: text("job_title").notNull(),
    jobDescription: text("job_description").notNull(),
    link: text("link"),
    status: text("status").notNull().default("waiting for response"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("jobs_userId_idx").on(table.userId)]
);

export const personalInformation = pgTable(
  "personal_information",
  {
    id: serial("id").primaryKey(),
    resumeUrl: text("resume_url"),
    resumeLatex: text("resume_latex"),
    aiPreferences: text("ai_preferences"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("personalInformation_userId_idx").on(table.userId)]
);

export const resumes = pgTable(
  "resumes",
  {
    id: serial("id").primaryKey(),
    resumeLatex: text("resume_latex").notNull(),
    resumeUrl: text("resume_url"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    jobId: integer("job_id").references(() => jobs.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("resumes_userId_idx").on(table.userId),
    index("resumes_jobId_idx").on(table.jobId),
  ]
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
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
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const analysis = pgTable(
  "analysis",
  {
    id: serial("id").primaryKey(),
    jobId: integer("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    matchPercentage: integer("match_percentage").notNull(),
    summary: text("summary").notNull(),
    strengths: text("strengths").notNull(), // JSON array stored as text
    missingKeywords: text("missing_keywords").notNull(), // JSON array stored as text
    improvementSuggestions: text("improvement_suggestions").notNull(), // JSON array stored as text
    additionalInsights: text("additional_insights"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("analysis_jobId_idx").on(table.jobId),
    index("analysis_userId_idx").on(table.userId),
  ]
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  jobs: many(jobs),
  personalInformation: many(personalInformation),
  resumes: many(resumes),
  analysis: many(analysis),
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
  user: one(user, {
    fields: [jobs.userId],
    references: [user.id],
  }),
  resumes: many(resumes),
  analysis: many(analysis),
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

export const resumesRelations = relations(resumes, ({ one }) => ({
  user: one(user, {
    fields: [resumes.userId],
    references: [user.id],
  }),
  job: one(jobs, {
    fields: [resumes.jobId],
    references: [jobs.id],
  }),
}));

export const analysisRelations = relations(analysis, ({ one }) => ({
  user: one(user, {
    fields: [analysis.userId],
    references: [user.id],
  }),
  job: one(jobs, {
    fields: [analysis.jobId],
    references: [jobs.id],
  }),
}));

export const schema = {
  user,
  session,
  account,
  verification,
  jobs,
  personalInformation,
  resumes,
  analysis,
};
