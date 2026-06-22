// ponytail: card.css injected via manifest; tokens match app globals.css oklch values
const CARD_ID = "jm-card";
let appUrl = "http://localhost:3000";
let currentUrl = location.href;
let autoAnalyze = false;
let autoSave = false;

let lastAnalysis = null;
let lastJd = null;
let savedJobId = null;

function resetPageState() { lastAnalysis = null; lastJd = null; savedJobId = null; }

// ── Extraction ────────────────────────────────────────────────────────────────

function extractJobDescription() {
  const el = document.querySelector('[data-testid="expandable-text-box"]');
  if (el?.textContent?.trim()) return el.textContent.trim().slice(0, 8000);
  for (const sel of ["#job-details", "article"]) {
    const fb = document.querySelector(sel);
    if (fb?.textContent?.trim()) return fb.textContent.trim().slice(0, 8000);
  }
  return null;
}

function extractJobTitle() {
  const sel = document.querySelector('[aria-label^="Selected,"]');
  if (sel) return sel.getAttribute("aria-label").replace(/^Selected,\s*/, "").replace(/\s*\(Verified job\)$/, "").trim();
  return document.title.replace(/\s*\|\s*LinkedIn$/, "").trim() || "Job";
}

// ── Card DOM ──────────────────────────────────────────────────────────────────

function getCard() { return document.getElementById(CARD_ID); }
function removeCard() { getCard()?.remove(); }
function isFloat() { return getCard()?.dataset.mode === "float"; }

function findAnchor() {
  return document.querySelector('[componentkey*="JobDetails_AboutTheJob_"]');
}

function injectCard() {
  if (getCard()) return;
  resetPageState();

  const card = document.createElement("div");
  card.id = CARD_ID;

  const anchor = findAnchor();
  if (anchor) {
    card.dataset.mode = "inline";
    anchor.parentElement.insertBefore(card, anchor);
  } else {
    card.dataset.mode = "float";
    document.body.appendChild(card);
  }

  renderTrigger();
  if (autoAnalyze) runAnalysis();
}

// ── Render states ─────────────────────────────────────────────────────────────

function setHtml(html) {
  const c = getCard();
  if (c) c.innerHTML = html;
}

// Wrap content for floating card (adds padding + fixed width)
function wrap(inner) {
  return isFloat() ? `<div class="jm-p jm-w280">${inner}</div>` : inner;
}

function renderTrigger() {
  if (isFloat()) {
    setHtml(`<div class="jm-p jm-row" id="jm-trigger" style="cursor:pointer;">
      <span style="font-size:20px;">🎯</span>
      <span class="jm-title">Match Score</span>
    </div>`);
    getCard().querySelector("#jm-trigger").addEventListener("click", runAnalysis);
  } else {
    setHtml(`<div class="jm-btwn" style="align-items:center;">
      <div class="jm-row">
        <span style="font-size:18px;">🎯</span>
        <span class="jm-title">Check resume match</span>
      </div>
      <button class="jm-btn jm-btn-p" id="jm-analyze">Analyze →</button>
    </div>`);
    getCard().querySelector("#jm-analyze").addEventListener("click", runAnalysis);
  }
}

function renderLoading(text = "Analyzing…") {
  setHtml(wrap(`<div class="jm-row"><div class="jm-spin"></div><span class="jm-body">${text}</span></div>`));
}

function scoreClass(pct) {
  return pct >= 70 ? "jm-c-ok" : pct >= 50 ? "jm-c-wa" : "jm-c-er";
}

function actionButtons(jobId) {
  if (jobId) {
    return `
      <a href="${appUrl}/editor?jobId=${jobId}" target="_blank" class="jm-btn jm-btn-p${isFloat() ? " jm-full" : ""}">Customize Resume →</a>
      <a href="${appUrl}/jobs" target="_blank" class="jm-btn jm-btn-o${isFloat() ? " jm-full" : ""}">View Tracker</a>`;
  }
  return `
    <a href="${appUrl}/analyze" target="_blank" class="jm-btn jm-btn-p${isFloat() ? " jm-full" : ""}">Full Analysis →</a>
    <button class="jm-btn jm-btn-o${isFloat() ? " jm-full" : ""}" id="jm-save">💾 Save Job</button>`;
}

function renderResult(data, jobId) {
  const card = getCard();
  if (!card) return;
  const { match_percentage: pct, summary } = data.result;
  const cls = scoreClass(pct);

  const inner = isFloat()
    ? `<div class="jm-btwn" style="margin-bottom:12px;">
         <span class="jm-label">Match Score</span>
         <button class="jm-btn-g" id="jm-close" style="font-size:18px;line-height:1;">✕</button>
       </div>
       <div class="jm-score-lg ${cls}">${pct}%</div>
       <p class="jm-body" style="margin-bottom:14px;">${summary}</p>
       <div class="jm-col">${actionButtons(jobId)}</div>`
    : `<div class="jm-btwn">
         <div class="jm-grow">
           <div class="jm-row" style="align-items:baseline;margin-bottom:6px;">
             <span class="jm-score ${cls}">${pct}%</span>
             <span class="jm-badge">match</span>
           </div>
           <p class="jm-body">${summary}</p>
         </div>
         <div class="jm-col jm-shrink">
           ${actionButtons(jobId)}
           <button class="jm-btn-g" id="jm-close">dismiss</button>
         </div>
       </div>`;

  setHtml(wrap(inner));

  card.querySelector("#jm-save")?.addEventListener("click", doSaveJob);
  card.querySelector("#jm-close")?.addEventListener("click", () => {
    removeCard();
    if (isFloat()) setTimeout(() => injectCard(), 600);
  });
}

function renderError(msg) {
  const card = getCard();
  if (!card) return;
  const isAuth = msg === "Not logged in";

  const inner = isFloat()
    ? `<div class="jm-btwn" style="margin-bottom:10px;">
         <span class="jm-label">JobMatch</span>
         <button class="jm-btn-g" id="jm-close" style="font-size:18px;line-height:1;">✕</button>
       </div>
       <p class="jm-body jm-c-er" style="margin-bottom:12px;">${msg}</p>
       ${isAuth ? `<a href="${appUrl}/login" target="_blank" class="jm-btn jm-btn-p jm-full">Log In →</a>` : ""}`
    : `<div class="jm-btwn" style="align-items:center;">
         <p class="jm-body jm-c-er">${msg}</p>
         ${isAuth
           ? `<a href="${appUrl}/login" target="_blank" class="jm-btn jm-btn-p">Log In →</a>`
           : `<button class="jm-btn-g" id="jm-retry">Retry</button>`
         }
       </div>`;

  setHtml(wrap(inner));
  card.querySelector("#jm-retry")?.addEventListener("click", runAnalysis);
  card.querySelector("#jm-close")?.addEventListener("click", () => {
    removeCard();
    if (isFloat()) setTimeout(() => injectCard(), 600);
  });
}

// ── Actions ───────────────────────────────────────────────────────────────────

function sendMsg(payload) {
  return new Promise((resolve) => chrome.runtime.sendMessage(payload, resolve));
}

async function runAnalysis() {
  const jd = extractJobDescription();
  if (!jd) { renderError("Could not read job description from this page."); return; }

  renderLoading("Analyzing your resume…");
  const result = await sendMsg({ type: "ANALYZE", jobDescription: jd });
  if (result?.error) { renderError(result.error); return; }

  lastAnalysis = result.result;
  lastJd = jd;

  if (autoSave) {
    renderLoading("Saving job…");
    const saveRes = await sendMsg({
      type: "SAVE_JOB",
      jobTitle: extractJobTitle(),
      jobDescription: jd,
      link: location.href,
      analysis: result.result,
    });
    if (!saveRes?.error) savedJobId = saveRes?.job?.id ?? null;
  }

  renderResult(result, savedJobId);
}

async function doSaveJob() {
  const btn = getCard()?.querySelector("#jm-save");
  if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }

  const res = await sendMsg({
    type: "SAVE_JOB",
    jobTitle: extractJobTitle(),
    jobDescription: lastJd,
    link: location.href,
    analysis: lastAnalysis,
  });

  if (res?.error) {
    if (btn) { btn.disabled = false; btn.textContent = "💾 Save Job"; }
    return;
  }
  savedJobId = res?.job?.id ?? null;
  renderResult({ result: lastAnalysis }, savedJobId);
}

// ── Init & SPA navigation ─────────────────────────────────────────────────────

function isJobPage() {
  const u = new URL(location.href);
  return u.pathname.startsWith("/jobs/") &&
    (u.searchParams.has("currentJobId") || u.pathname.includes("/view/"));
}

let settleTimer = null;
function scheduleInject() {
  clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    if (!isJobPage()) { removeCard(); return; }
    if (!getCard() && findAnchor()) injectCard();
  }, 800);
}

const observer = new MutationObserver(() => {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    removeCard();
  }
  if (isJobPage() && !getCard()) scheduleInject();
});

chrome.runtime.sendMessage({ type: "GET_INIT" }, (res) => {
  if (res?.appUrl) appUrl = res.appUrl;
  if (res?.settings?.autoAnalyze) autoAnalyze = true;
  if (res?.settings?.autoSave) autoSave = true;
  observer.observe(document.body, { childList: true, subtree: true });
  scheduleInject();
});
