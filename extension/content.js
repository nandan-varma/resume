// ponytail: APP_URL read from background to stay in sync
const JD_SELECTORS = [
  "#job-details",
  '[class*="jobs-description__content"]',
  '[class*="description__text"]',
  "article",
];

let card = null;
let currentUrl = location.href;
let appUrl = "http://localhost:3000";

// Inject spinner keyframe once
const style = document.createElement("style");
style.textContent = "@keyframes jm-spin{to{transform:rotate(360deg)}}";
document.head.appendChild(style);

function extractJobDescription() {
  for (const sel of JD_SELECTORS) {
    const el = document.querySelector(sel);
    if (el?.textContent?.trim()) return el.textContent.trim().slice(0, 8000);
  }
  return null;
}

function isJobPage() {
  return /linkedin\.com\/jobs\/(view|collections)/.test(location.href);
}

function removeCard() {
  card?.remove();
  card = null;
}

function createTrigger() {
  if (card) return;
  card = document.createElement("div");
  card.id = "jm-card";
  card.style.cssText =
    "position:fixed;bottom:20px;right:20px;z-index:2147483647;background:#18181b;color:#fff;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,.5);font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:14px;overflow:hidden;cursor:pointer;";
  card.innerHTML = `<div style="padding:10px 14px;display:flex;align-items:center;gap:8px;" id="jm-trigger">
    <span style="font-size:20px">🎯</span>
    <span style="font-weight:600;font-size:13px;">Match Score</span>
  </div>`;
  card.querySelector("#jm-trigger").addEventListener("click", runAnalysis);
  document.body.appendChild(card);
}

function renderResult(data) {
  const { match_percentage, summary } = data.result;
  const color =
    match_percentage >= 70 ? "#22c55e" : match_percentage >= 50 ? "#f59e0b" : "#ef4444";
  setCardHtml(`
    <div style="padding:16px;width:280px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-weight:700;font-size:11px;letter-spacing:.08em;color:#71717a;">MATCH SCORE</span>
        <button id="jm-close" style="background:none;border:none;color:#71717a;cursor:pointer;font-size:18px;line-height:1;padding:0;">✕</button>
      </div>
      <div style="font-size:48px;font-weight:800;color:${color};line-height:1;margin-bottom:12px;">${match_percentage}%</div>
      <p style="color:#d4d4d8;font-size:12px;line-height:1.55;margin:0 0 14px;">${summary}</p>
      <a href="${appUrl}/analyze" target="_blank" style="display:block;text-align:center;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;padding:9px;font-size:12px;font-weight:600;">Full Analysis →</a>
    </div>
  `);
  card.querySelector("#jm-close").addEventListener("click", (e) => {
    e.stopPropagation();
    removeCard();
    setTimeout(createTrigger, 600);
  });
}

function renderError(msg) {
  const isAuth = msg === "Not logged in";
  setCardHtml(`
    <div style="padding:16px;width:240px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
        <span style="font-weight:700;font-size:11px;letter-spacing:.08em;color:#71717a;">JOBMATCH</span>
        <button id="jm-close" style="background:none;border:none;color:#71717a;cursor:pointer;font-size:18px;line-height:1;padding:0;">✕</button>
      </div>
      <p style="color:#f87171;font-size:12px;margin:0 0 12px;">${msg}</p>
      ${isAuth ? `<a href="${appUrl}/login" target="_blank" style="display:block;text-align:center;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;padding:9px;font-size:12px;font-weight:600;">Log In →</a>` : ""}
    </div>
  `);
  card.querySelector("#jm-close")?.addEventListener("click", () => {
    removeCard();
    setTimeout(createTrigger, 600);
  });
}

function renderLoading() {
  setCardHtml(`
    <div style="padding:16px;display:flex;align-items:center;gap:10px;min-width:170px;">
      <div style="width:18px;height:18px;border:2px solid #6366f1;border-top-color:transparent;border-radius:50%;animation:jm-spin .8s linear infinite;flex-shrink:0;"></div>
      <span style="color:#a1a1aa;font-size:13px;">Analyzing…</span>
    </div>
  `);
}

function setCardHtml(html) {
  if (!card) return;
  card.innerHTML = html;
}

async function runAnalysis() {
  const jd = extractJobDescription();
  if (!jd) {
    renderError("Could not read job description from this page.");
    return;
  }
  renderLoading();
  const result = await chrome.runtime.sendMessage({ type: "ANALYZE", jobDescription: jd });
  if (result?.error) renderError(result.error);
  else renderResult(result);
}

function init() {
  if (isJobPage()) createTrigger();
  else removeCard();
}

// Sync appUrl from background and init
chrome.runtime.sendMessage({ type: "CHECK_AUTH" }, (res) => {
  if (res?.appUrl) appUrl = res.appUrl;
  init();
});

// Handle LinkedIn SPA navigation
setInterval(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    removeCard();
    setTimeout(init, 1200);
  }
}, 1000);
