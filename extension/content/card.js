// Card DOM: anchor detection, injection, and render states.
const CARD_ID = "jm-card";

// Line-icon SVGs (currentColor, 24x24 viewBox) — sized via .jm-icon / .jm-icon-lg
// in card.css. Kept as inline markup (no icon font/library dependency) so the
// content script stays a plain, dependency-free script.
const ICONS = {
  target:
    '<svg class="jm-icon-lg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
  bookmark:
    '<svg class="jm-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 3.5C6 3.22 6.22 3 6.5 3H17.5C17.78 3 18 3.22 18 3.5V21L12 17L6 21V3.5Z" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/></svg>',
  close:
    '<svg class="jm-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 5L19 19M19 5L5 19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
};

// LinkedIn ships two different job-detail layouts: the standalone
// /jobs/view/ page (has the componentkey anchor) and the two-pane
// /jobs/search/ results view (stable BEM classnames). Prefer placing the
// card right after the job title/company header — the most prominent spot,
// above LinkedIn's own upsell cards — and fall back to right above the
// description when the header isn't found. injectCard() falls back further
// to a floating card if nothing matches, so the extension never renders
// nothing.
const ANCHOR_AFTER_SELECTORS = [
  ".job-details-jobs-unified-top-card__container--two-pane",
];
const ANCHOR_BEFORE_SELECTORS = [
  '[componentkey*="JobDetails_AboutTheJob_"]',
  ".jobs-details__main-content .jobs-description",
];

function escHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getCard() {
  return document.getElementById(CARD_ID);
}
function removeCard() {
  getCard()?.remove();
}
function isFloat() {
  return getCard()?.dataset.mode === "float";
}

function findFirst(selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      return el;
    }
  }
  return null;
}

function injectCard() {
  if (getCard()) {
    return;
  }
  resetPageState();

  const card = document.createElement("div");
  card.id = CARD_ID;

  const afterAnchor = findFirst(ANCHOR_AFTER_SELECTORS);
  const beforeAnchor = afterAnchor ? null : findFirst(ANCHOR_BEFORE_SELECTORS);

  if (afterAnchor) {
    card.dataset.mode = "inline";
    afterAnchor.insertAdjacentElement("afterend", card);
    logger.debug("Card injected inline (after header)");
  } else if (beforeAnchor) {
    card.dataset.mode = "inline";
    beforeAnchor.parentElement.insertBefore(card, beforeAnchor);
    logger.debug("Card injected inline (before description)");
  } else {
    card.dataset.mode = "float";
    document.body.appendChild(card);
    logger.debug("Card injected as float (no known anchor on this page)");
  }

  renderTrigger();
  if (autoAnalyze) {
    runAnalysis();
  }
}

// If the card floated because the anchor wasn't in the DOM yet (slow
// network), move it inline once the anchor shows up. Only safe to do while
// still on the pre-analysis trigger — mid-flow (loading/result/error) is
// left alone so an in-progress analysis or its result isn't disturbed.
function tryRelocateToInline() {
  const card = getCard();
  if (!card || card.dataset.mode !== "float") {
    return;
  }
  if (!card.querySelector("#jm-trigger, #jm-analyze")) {
    return;
  }

  const afterAnchor = findFirst(ANCHOR_AFTER_SELECTORS);
  const beforeAnchor = afterAnchor ? null : findFirst(ANCHOR_BEFORE_SELECTORS);
  const anchor = afterAnchor || beforeAnchor;
  if (!anchor) {
    return;
  }

  card.dataset.mode = "inline";
  if (afterAnchor) {
    afterAnchor.insertAdjacentElement("afterend", card);
  } else {
    anchor.parentElement.insertBefore(card, anchor);
  }
  renderTrigger();
  logger.debug("Card relocated from float to inline");
}

// ── Render states ─────────────────────────────────────────────────────────────

function setHtml(html) {
  const c = getCard();
  if (c) {
    c.innerHTML = html;
  }
}

// Wrap content for floating card (adds padding + fixed width)
function wrap(inner) {
  return isFloat() ? `<div class="jm-p jm-w280">${inner}</div>` : inner;
}

function renderTrigger() {
  if (isFloat()) {
    setHtml(`<div class="jm-p jm-row" id="jm-trigger" style="cursor:pointer;">
      ${ICONS.target}
      <span class="jm-title">Match Score</span>
    </div>`);
    getCard()
      .querySelector("#jm-trigger")
      .addEventListener("click", runAnalysis);
  } else {
    setHtml(`<div class="jm-btwn" style="align-items:center;">
      <div class="jm-row">
        ${ICONS.target}
        <span class="jm-title">Check resume match</span>
      </div>
      <button class="jm-btn jm-btn-p" id="jm-analyze">Analyze →</button>
    </div>`);
    getCard()
      .querySelector("#jm-analyze")
      .addEventListener("click", runAnalysis);
  }
}

function renderLoading(text = "Analyzing…") {
  setHtml(
    wrap(
      `<div class="jm-row"><div class="jm-spin"></div><span class="jm-body">${text}</span></div>`
    )
  );
}

function scoreClass(pct) {
  if (pct >= 70) {
    return "jm-c-ok";
  }
  if (pct >= 50) {
    return "jm-c-wa";
  }
  return "jm-c-er";
}

function actionButtons(jobId) {
  if (jobId) {
    return `
      <a href="${appUrl}/editor?jobId=${jobId}" target="_blank" class="jm-btn jm-btn-p${isFloat() ? " jm-full" : ""}">Customize Resume →</a>
      <a href="${appUrl}/jobs" target="_blank" class="jm-btn jm-btn-o${isFloat() ? " jm-full" : ""}">View Tracker</a>`;
  }
  return `
    <a href="${appUrl}/jobs" target="_blank" class="jm-btn jm-btn-p${isFloat() ? " jm-full" : ""}">Open Tracker →</a>
    <button class="jm-btn jm-btn-o${isFloat() ? " jm-full" : ""}" id="jm-save">${ICONS.bookmark} Save Job</button>`;
}

function renderResult(data, jobId) {
  const card = getCard();
  if (!card) {
    return;
  }
  const { match_percentage: pct, summary } = data.result;
  const cls = scoreClass(pct);

  const inner = isFloat()
    ? `<div class="jm-btwn" style="margin-bottom:12px;">
         <span class="jm-label">Match Score</span>
         <button class="jm-btn-g jm-btn-close" id="jm-close" aria-label="Dismiss">${ICONS.close}</button>
       </div>
       <div class="jm-score-lg ${cls}">${pct}%</div>
       <p class="jm-body" style="margin-bottom:14px;">${escHtml(summary)}</p>
       <div class="jm-col">${actionButtons(jobId)}</div>`
    : `<div class="jm-btwn">
         <div class="jm-grow">
           <div class="jm-row" style="align-items:baseline;margin-bottom:6px;">
             <span class="jm-score ${cls}">${pct}%</span>
             <span class="jm-badge">match</span>
           </div>
           <p class="jm-body">${escHtml(summary)}</p>
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
    if (isFloat()) {
      setTimeout(() => injectCard(), 600);
    }
  });
}

function renderError(msg) {
  const card = getCard();
  if (!card) {
    return;
  }
  const isAuth = msg === "Not logged in";

  // Logging in happens in a separate tab, so the card can't detect it on its
  // own — always leave a retry path rather than stranding the user on a
  // stale "not logged in" state they can only escape by reloading LinkedIn.
  const inner = isFloat()
    ? `<div class="jm-btwn" style="margin-bottom:10px;">
         <span class="jm-label">JobMatch</span>
         <button class="jm-btn-g jm-btn-close" id="jm-close" aria-label="Dismiss">${ICONS.close}</button>
       </div>
       <p class="jm-body jm-c-er" style="margin-bottom:12px;">${escHtml(msg)}</p>
       ${
         isAuth
           ? `<div class="jm-col">
                <a href="${appUrl}/login" target="_blank" class="jm-btn jm-btn-p jm-full">Log In →</a>
                <button class="jm-btn-g" id="jm-retry">I've logged in, retry</button>
              </div>`
           : ""
}`
    : `<div class="jm-btwn" style="align-items:center;">
         <p class="jm-body jm-c-er">${escHtml(msg)}</p>
         ${
           isAuth
             ? `<div class="jm-row">
                  <a href="${appUrl}/login" target="_blank" class="jm-btn jm-btn-p">Log In →</a>
                  <button class="jm-btn-g" id="jm-retry">Retry</button>
                </div>`
             : `<button class="jm-btn-g" id="jm-retry">Retry</button>`
}
       </div>`;

  setHtml(wrap(inner));
  card.querySelector("#jm-retry")?.addEventListener("click", runAnalysis);
  card.querySelector("#jm-close")?.addEventListener("click", () => {
    removeCard();
    if (isFloat()) {
      setTimeout(() => injectCard(), 600);
    }
  });
}
