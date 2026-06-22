import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db/drizzle";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";

// Deduplicates session lookups within a single request/render
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() })
);

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const currentUser = await db.query.user.findFirst({
    where: eq(user.id, session.user.id),
  });
  if (!currentUser) {
    redirect("/login");
  }
  return { session, currentUser };
}
