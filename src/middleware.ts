import { defineMiddleware } from "astro:middleware";
import { auth } from "@/lib/auth";

const PROTECTED = ["/profile", "/resumes", "/settings"];

export const onRequest = defineMiddleware(async (context, next) => {
  const session = await auth.api.getSession({
    headers: context.request.headers,
  });
  context.locals.user = session?.user ?? null;

  const { pathname } = context.url;
  if (
    !context.locals.user &&
    PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
    return context.redirect(`/login?next=${encodeURIComponent(pathname)}`);
  }
  return next();
});
