// For local dev: set homepage_url to "http://localhost:3000" in manifest.json
const APP_URL =
  chrome.runtime.getManifest().homepage_url ?? "https://resume.nandan.fyi";

const DEFAULT_SETTINGS = {
  autoAnalyze: false,
  autoSave: false,
  modelId: "gemini-2.5-flash-lite",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSessionCookie() {
  return chrome.cookies.get({
    url: APP_URL,
    name: "better-auth.session_token",
  });
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
      Cookie: `better-auth.session_token=${cookie.value}`,
      ...(options.headers ?? {}),
    },
  });
}

function getSettings() {
  return chrome.storage.sync.get({ ...DEFAULT_SETTINGS, appUrl: APP_URL });
}

// ── Message handlers ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const handlers = {
    GET_INIT: handleGetInit,
    GET_SETTINGS: () => getSettings(),
    SET_SETTINGS: () =>
      chrome.storage.sync.set(msg.settings).then(() => ({ ok: true })),
    ANALYZE: () => handleAnalyze(msg.jobDescription),
    SAVE_JOB: () =>
      handleSaveJob(msg.jobTitle, msg.jobDescription, msg.link, msg.analysis),
    SIGN_OUT: handleSignOut,
  };

  const handler = handlers[msg.type];
  if (!handler) {
    return;
  }
  handler()
    .then(sendResponse)
    .catch((e) => sendResponse({ error: e.message }));
  return true;
});

async function handleGetInit() {
  const [cookie, settings] = await Promise.all([
    getSessionCookie(),
    getSettings(),
  ]);
  if (!cookie) {
    return { loggedIn: false, user: null, settings, appUrl: APP_URL };
  }

  try {
    const res = await authedFetch("/api/auth/get-session");
    const data = await res.json();
    return {
      loggedIn: !!data?.user,
      user: data?.user ?? null,
      settings,
      appUrl: APP_URL,
    };
  } catch {
    return { loggedIn: false, user: null, settings, appUrl: APP_URL };
  }
}

async function handleAnalyze(jobDescription) {
  const cookie = await getSessionCookie();
  if (!cookie) {
    return { error: "Not logged in" };
  }

  const { modelId } = await getSettings();

  const res = await authedFetch("/api/analyze", {
    method: "POST",
    body: JSON.stringify({ jobDescription, modelId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.error || `Request failed (${res.status})` };
  }
  return res.json();
}

async function handleSaveJob(jobTitle, jobDescription, link, analysis) {
  const cookie = await getSessionCookie();
  if (!cookie) {
    return { error: "Not logged in" };
  }

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
    return { error: err.error || `Failed to save (${res.status})` };
  }
  return res.json();
}

async function handleSignOut() {
  try {
    await authedFetch("/api/auth/sign-out", { method: "POST" });
  } catch {
    // cookie cleared server-side best-effort
  }
  return { ok: true };
}
