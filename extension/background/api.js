import { logger } from "../shared/logger.js";
import { APP_URL } from "./config.js";
import { getSettings } from "./settings.js";

// better-auth prefixes the session cookie with "__Secure-" whenever baseURL
// is https (i.e. always in production) — see createCookieGetter in
// better-auth/dist/cookies/index.mjs. Match by suffix so this works for both
// the plain name (local http dev) and the __Secure- prefixed name (prod).
async function getSessionCookie() {
  const cookies = await chrome.cookies.getAll({ url: APP_URL });
  return (
    cookies.find((c) => c.name.endsWith("better-auth.session_token")) ?? null
  );
}

async function authedFetch(path, options = {}) {
  const cookie = await getSessionCookie();
  if (!cookie) {
    return null;
  }
  return fetch(`${APP_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Cookie: `${cookie.name}=${cookie.value}`,
      ...(options.headers ?? {}),
    },
  });
}

export async function handleGetInit() {
  const [cookie, settings] = await Promise.all([
    getSessionCookie(),
    getSettings(),
  ]);
  if (!cookie) {
    logger.info("GET_INIT: no session cookie");
    return { loggedIn: false, user: null, settings, appUrl: APP_URL };
  }

  try {
    const res = await authedFetch("/api/auth/get-session");
    const data = await res.json();
    logger.info("GET_INIT: loggedIn =", !!data?.user);
    return {
      loggedIn: !!data?.user,
      user: data?.user ?? null,
      settings,
      appUrl: APP_URL,
    };
  } catch (e) {
    logger.error("GET_INIT failed:", e.message);
    return { loggedIn: false, user: null, settings, appUrl: APP_URL };
  }
}

export async function handleAnalyze(jobDescription) {
  const cookie = await getSessionCookie();
  if (!cookie) {
    return { error: "Not logged in" };
  }

  const { modelId } = await getSettings();
  logger.info(
    "ANALYZE: jdLen =",
    jobDescription?.length ?? 0,
    "model =",
    modelId
  );

  const res = await authedFetch("/api/analyze", {
    method: "POST",
    body: JSON.stringify({ jobDescription, modelId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    logger.error("ANALYZE failed:", res.status, err.error);
    return { error: err.error || `Request failed (${res.status})` };
  }
  return res.json();
}

export async function handleSaveJob(jobTitle, jobDescription, link, analysis) {
  const cookie = await getSessionCookie();
  if (!cookie) {
    return { error: "Not logged in" };
  }

  logger.info("SAVE_JOB:", jobTitle);
  const res = await authedFetch("/api/jobs", {
    method: "POST",
    body: JSON.stringify({
      jobTitle,
      jobDescription,
      link,
      ...(analysis ? { analysis } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    logger.error("SAVE_JOB failed:", res.status, err.error);
    return { error: err.error || `Failed to save (${res.status})` };
  }
  return res.json();
}

export async function handleSignOut() {
  try {
    await authedFetch("/api/auth/sign-out", { method: "POST" });
  } catch {
    // cookie cleared server-side best-effort
  }
  return { ok: true };
}
