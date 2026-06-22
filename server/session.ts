import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
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
  return { session, currentUser: session.user };
}
