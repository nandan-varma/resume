// ponytail: card.css injected via manifest; tokens match app globals.css oklch values
let appUrl = "http://localhost:3000";
let currentUrl = location.href;
let autoAnalyze = false;
let autoSave = false;

let lastAnalysis = null;
let lastJd = null;
let savedJobId = null;

function resetPageState() {
  lastAnalysis = null;
  lastJd = null;
  savedJobId = null;
}

// ── Actions ───────────────────────────────────────────────────────────────────

function sendMsg(payload) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(payload, resolve);
    } catch {
      // ponytail: extension was reloaded; stop the observer so it doesn't keep firing
      observer?.disconnect();
      resolve({ error: "Extension reloaded — refresh the page to re-enable." });
    }
  });
}

async function runAnalysis() {
  let jd = extractJobDescription();
  if (!jd) {
    // LinkedIn's pane content can still be streaming in right after the
    // trigger/anchor mounts — one short retry before giving up.
    renderLoading("Loading job description…");
    await new Promise((resolve) => setTimeout(resolve, 700));
    jd = extractJobDescription();
  }
  if (!jd) {
    renderError("Could not read job description from this page.");
    return;
  }

  renderLoading("Analyzing your resume…");
  const result = await sendMsg({ type: "ANALYZE", jobDescription: jd });
  if (result?.error) {
    logger.warn("Analyze failed:", result.error);
    renderError(result.error);
    return;
  }

  lastAnalysis = result.result;
  lastJd = jd;
  logger.info("Analyzed:", result.result?.match_percentage, "% match");

  if (autoSave) {
    renderLoading("Saving job…");
    const saveRes = await sendMsg({
      type: "SAVE_JOB",
      jobTitle: extractJobTitle(),
      jobDescription: jd,
      link: location.href,
      analysis: result.result,
    });
    if (saveRes?.error) {
      logger.warn("Auto-save failed:", saveRes.error);
    } else {
      savedJobId = saveRes?.job?.id ?? null;
    }
  }

  renderResult(result, savedJobId);
}

async function doSaveJob() {
  const btn = getCard()?.querySelector("#jm-save");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Saving…";
  }

  const res = await sendMsg({
    type: "SAVE_JOB",
    jobTitle: extractJobTitle(),
    jobDescription: lastJd,
    link: location.href,
    analysis: lastAnalysis,
  });

  if (res?.error) {
    logger.warn("Save failed:", res.error);
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `${ICONS.bookmark} Save Job`;
    }
    return;
  }
  savedJobId = res?.job?.id ?? null;
  renderResult({ result: lastAnalysis }, savedJobId);
}

// ── Init & SPA navigation ─────────────────────────────────────────────────────

function isJobPage() {
  const u = new URL(location.href);
  return (
    u.pathname.startsWith("/jobs/") &&
    (u.searchParams.has("currentJobId") || u.pathname.includes("/view/"))
  );
}

// LinkedIn's SPA mutates the DOM constantly (renders, ads, tracking) — react
// once mutations settle rather than doing work on every single mutation
// burst. Keeps the extension's footprint on the page as light as possible.
let settleTimer = null;
function handleDomSettled() {
  if (location.href !== currentUrl) {
    currentUrl = location.href;
    removeCard();
  }
  if (!isJobPage()) {
    removeCard();
    return;
  }
  if (getCard()) {
    tryRelocateToInline();
  } else {
    // injectCard() handles anchor-vs-float fallback itself — always call it,
    // otherwise a page whose anchor never appears never shows the card at all.
    injectCard();
  }
}

const observer = new MutationObserver(() => {
  clearTimeout(settleTimer);
  settleTimer = setTimeout(handleDomSettled, 800);
});

chrome.runtime.sendMessage({ type: "GET_INIT" }, (res) => {
  if (res?.appUrl) {
    appUrl = res.appUrl;
  }
  if (res?.settings?.autoAnalyze) {
    autoAnalyze = true;
  }
  if (res?.settings?.autoSave) {
    autoSave = true;
  }
  logger.info(
    "Initialized. loggedIn =",
    res?.loggedIn,
    "autoAnalyze =",
    autoAnalyze,
    "autoSave =",
    autoSave
  );
  observer.observe(document.body, { childList: true, subtree: true });
  settleTimer = setTimeout(handleDomSettled, 800);
});
