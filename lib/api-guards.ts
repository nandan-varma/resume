import "server-only";

import type { z } from "zod";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

type Session = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

// `ok` is a fixed literal tag, not a check for a dynamically-named field —
// unlike an `"error" in result` style check, it can never collide with
// request data (e.g. a schema field, chat message, or username) that
// happens to be called "error", "data", or "session".
type ApiResult<T> = { ok: true; data: T } | { ok: false; response: Response };

// Every API route starts with the same auth check — centralized so the
// 401 shape only needs to change in one place.
export async function requireApiSession(
  req: Request
): Promise<ApiResult<{ session: Session }>> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, data: { session } };
}

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): Response | null {
  if (rateLimit(key, max, windowMs)) {
    return null;
  }
  return Response.json(
    { error: "Too many requests. Please wait a minute." },
    { status: 429 }
  );
}

// Every API route repeated the same "parse JSON, validate with Zod, 400 on
// either failure" boilerplate with slightly different error shapes.
export async function parseJsonBody<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<ApiResult<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return {
      ok: false,
      response: Response.json(
        { error: "Invalid request body" },
        { status: 400 }
      ),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: Response.json(
        {
          error: `Invalid request: ${parsed.error.issues.map((e) => e.message).join(", ")}`,
        },
        { status: 400 }
      ),
    };
  }

  return { ok: true, data: parsed.data };
}
