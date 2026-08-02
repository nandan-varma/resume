type PageFillMode = "editing" | "consultation";

// Shared between /api/edit-latex (making edits) and /api/job-customize
// (deciding what to ask about before tailoring) so both AI calls reason
// about page space the same way, just phrased for what each is deciding.
export function buildPageFillHint(
  pageCount: number,
  fillRatio: number | undefined,
  mode: PageFillMode
): string {
  const pct = fillRatio === undefined ? null : Math.round(fillRatio * 100);

  if (pageCount === 1) {
    if (pct !== null && pct < 80) {
      return mode === "editing"
        ? `Fits on one page but only fills ~${pct}% of it — there's room to add more content (more bullet detail, an extra project, a summary), grow font/spacing, or widen margins to use the page fully.`
        : `Fits on one page but only fills ~${pct}% of it — feel free to ask for one more concrete fact or story that could add a bullet worth of content to better use the page.`;
    }
    return mode === "editing"
      ? "Fits on one page and uses the space well."
      : "Already fits on one page and uses the space well — don't ask for facts that would need to expand it further.";
  }

  if (pageCount === 2) {
    if (pct !== null && pct < 30) {
      return mode === "editing"
        ? `Spills onto a second page but that page is only ~${pct}% full — likely just a couple lines over; small tightening (shorter bullets, reduced vspace) should bring it back to one page.`
        : `Spills onto a second page but barely (~${pct}% full) — avoid asking for facts that would add more content; any question should aim at tightening, not expanding.`;
    }
    return mode === "editing"
      ? "Currently spills onto a second page — prefer tightening existing content (shorter bullets, reduced vspace) over adding new content unless the user explicitly asks to expand."
      : "Currently spills onto a second page — do not ask for additional content; a useful fact here would replace weaker existing content, not add to it.";
  }

  return mode === "editing"
    ? `${pageCount} pages — resume is long, lean toward cutting.`
    : `${pageCount} pages — resume is long; do not ask for more content, only for facts that could replace weaker existing content.`;
}
