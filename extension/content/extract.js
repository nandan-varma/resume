// Reading job data out of the LinkedIn DOM. LinkedIn ships different markup
// on the standalone /jobs/view/ page vs. the two-pane /jobs/search/ results
// view, so every selector here tries both in order.
const RE_SELECTED_PREFIX = /^Selected,\s*/;
const RE_VERIFIED_SUFFIX = /\s*\(Verified job\)$/;
const RE_LINKEDIN_SUFFIX = /\s*\|\s*LinkedIn$/;

const JD_SELECTORS = [
  '[data-testid="expandable-text-box"]',
  "#job-details",
  "article",
];

const TITLE_SELECTORS = [".job-details-jobs-unified-top-card__job-title", "h1"];

function extractJobDescription() {
  for (const sel of JD_SELECTORS) {
    const text = document.querySelector(sel)?.textContent?.trim();
    if (text) {
      logger.debug(`Job description via "${sel}" (${text.length} chars)`);
      return text.slice(0, 8000);
    }
  }
  logger.warn(
    "Could not find job description with any known selector",
    JD_SELECTORS
  );
  return null;
}

function extractJobTitle() {
  const aria = document.querySelector('[aria-label^="Selected,"]');
  if (aria) {
    return aria
      .getAttribute("aria-label")
      .replace(RE_SELECTED_PREFIX, "")
      .replace(RE_VERIFIED_SUFFIX, "")
      .trim();
  }
  for (const sel of TITLE_SELECTORS) {
    const text = document.querySelector(sel)?.textContent?.trim();
    if (text) {
      return text;
    }
  }
  // Expected on LinkedIn's standalone /jobs/view/ page, which has neither
  // selector above but whose document.title is already "Role | Company | LinkedIn".
  logger.debug("Falling back to document.title for job title");
  return document.title.replace(RE_LINKEDIN_SUFFIX, "").trim() || "Job";
}
