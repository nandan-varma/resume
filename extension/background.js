// ponytail: APP_URL hardcoded; switch to production URL before publishing
const APP_URL = "http://localhost:3000";
const MODEL_ID = "gemini-2.5-flash-lite";

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "ANALYZE") {
    analyzeJob(msg.jobDescription).then(sendResponse).catch((e) => sendResponse({ error: e.message }));
    return true;
  }
  if (msg.type === "CHECK_AUTH") {
    chrome.cookies
      .get({ url: APP_URL, name: "better-auth.session_token" })
      .then((c) => sendResponse({ loggedIn: !!c, appUrl: APP_URL }))
      .catch(() => sendResponse({ loggedIn: false, appUrl: APP_URL }));
    return true;
  }
});

async function analyzeJob(jobDescription) {
  const cookie = await chrome.cookies.get({ url: APP_URL, name: "better-auth.session_token" });
  if (!cookie) return { error: "Not logged in" };

  const res = await fetch(`${APP_URL}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `better-auth.session_token=${cookie.value}`,
    },
    body: JSON.stringify({ jobDescription, modelId: MODEL_ID }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { error: err.error || `Request failed (${res.status})` };
  }
  return res.json();
}
