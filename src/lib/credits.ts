import { ActionError } from "astro:actions";
import { and, eq, lt, sql } from "drizzle-orm";
import { db, schema } from "@/db";

/** AI actions per account per UTC day: a resume, a letter, an import or fresh search ideas. */
const DAILY_AI_LIMIT = 25;

const today = () => new Date().toISOString().slice(0, 10);

const hoursUntilReset = () => {
  const now = new Date();
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return Math.max(1, Math.ceil((next - now.getTime()) / 3_600_000));
};

/** Use one AI action, or explain that today's are gone. One statement, so parallel requests cannot overspend. */
const spend = async (userId: string) => {
  const rows = await db
    .insert(schema.aiUsage)
    .values({ userId, day: today(), count: 1 })
    .onConflictDoUpdate({
      target: [schema.aiUsage.userId, schema.aiUsage.day],
      set: { count: sql`${schema.aiUsage.count} + 1` },
      setWhere: lt(schema.aiUsage.count, DAILY_AI_LIMIT),
    })
    .returning({ count: schema.aiUsage.count });
  if (rows.length === 0) {
    const hours = hoursUntilReset();
    throw new ActionError({
      code: "TOO_MANY_REQUESTS",
      message: `You have used today's ${DAILY_AI_LIMIT} AI actions. They reset in about ${hours} ${hours === 1 ? "hour" : "hours"}. Everything you have made is still here to edit and download.`,
    });
  }
};

const refund = (userId: string) =>
  db
    .update(schema.aiUsage)
    .set({ count: sql`max(${schema.aiUsage.count} - 1, 0)` })
    .where(
      and(eq(schema.aiUsage.userId, userId), eq(schema.aiUsage.day, today())),
    );

/** Run an AI action that costs one credit, giving it back if the action fails. */
export const withCredit = async <T>(userId: string, run: () => Promise<T>) => {
  await spend(userId);
  try {
    return await run();
  } catch (error) {
    await refund(userId);
    throw error;
  }
};

/** What an account has used today, for Settings. */
export const creditsToday = async (userId: string) => {
  const row = await db.query.aiUsage.findFirst({
    where: and(
      eq(schema.aiUsage.userId, userId),
      eq(schema.aiUsage.day, today()),
    ),
  });
  return {
    used: row?.count ?? 0,
    limit: DAILY_AI_LIMIT,
    resetsInHours: hoursUntilReset(),
  };
};
