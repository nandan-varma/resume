import { actions } from "astro:actions";
import {
  Check,
  ExternalLink,
  FileText,
  Mail,
  Printer,
  Scissors,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { estimateLines, type Pages, type Paper, trimToFit } from "@/lib/layout";
import type { Resume } from "@/lib/resume";
import { summarizeChanges } from "@/lib/resume-diff";
import CoverLetterWriter from "./CoverLetterWriter";
import { SaveBadge, UndoRedo } from "./EditorBar";
import ResumeSheet, { type Edit } from "./ResumeSheet";
import { Button } from "./ui/button";
import { useDoc } from "./useDoc";

type Props = {
  id: string;
  role: string;
  company: string;
  applyUrl: string;
  applied: boolean;
  resume: Resume;
  coverLetter: string;
  /** The profile this was written from, so changes can be shown and undone. */
  master: Resume;
  /** The paper this resume is laid out and printed on. */
  paper: Paper;
  /** How many pages the resume may use. */
  pages: Pages;
  isNew: boolean;
  /** Match notes, rendered on the server. */
  aside?: ReactNode;
};

type Tab = "resume" | "letter";

export default function ApplicationEditor({
  id,
  company,
  applyUrl,
  applied: initialApplied,
  resume,
  coverLetter,
  master,
  paper,
  pages,
  isNew,
  aside,
}: Props) {
  const app = useDoc({ resume, coverLetter }, async (d) => {
    const { error } = await actions.saveApplication({ id, ...d });
    return error?.message ?? null;
  });
  const [tab, setTab] = useState<Tab>("resume");
  const [spare, setSpare] = useState<number | null>(null);
  const [applied, setApplied] = useState(initialApplied);

  const editResume: Edit = (key, change) =>
    app.edit(key, (d) => change(d.resume));
  const changes = summarizeChanges(master, app.doc.resume);
  const over = spare !== null && spare < 0;

  useEffect(() => {
    if (isNew) {
      toast.success("Your resume is ready. Click any line to edit it.");
      try {
        const notes: string[] = JSON.parse(
          sessionStorage.getItem("tailorNotes") ?? "[]",
        );
        sessionStorage.removeItem("tailorNotes");
        if (notes.length > 0) {
          toast.info(notes.join(" "), { duration: 12000 });
        }
      } catch {
        // No notes to show.
      }
      // So a reload does not repeat the welcome.
      const url = new URL(location.href);
      url.searchParams.delete("new");
      history.replaceState(history.state, "", url);
    }
  }, [isNew]);

  // The PDF takes its file name from the page title.
  useEffect(() => {
    let original = "";
    const before = () => {
      original = document.title;
      const name = app.doc.resume.basics.name || "Resume";
      document.title = `${name} - ${tab === "letter" ? "Cover letter" : "Resume"} - ${company}`;
    };
    const after = () => {
      document.title = original;
    };
    addEventListener("beforeprint", before);
    addEventListener("afterprint", after);
    return () => {
      removeEventListener("beforeprint", before);
      removeEventListener("afterprint", after);
    };
  }, [app.doc.resume.basics.name, company, tab]);

  // Trim the weakest content on the page as it is now, so your own edits stay. Undo brings it back.
  const tighten = () => {
    const before = estimateLines(app.doc.resume, paper);
    const tight = trimToFit(app.doc.resume, paper, pages);
    if (estimateLines(tight, paper) >= before) {
      toast.info(
        "Nothing more can be trimmed automatically. Remove a line or two yourself.",
      );
      return;
    }
    app.edit(`tighten:${Date.now()}`, (d) => {
      d.resume = tight;
    });
    toast.success("Trimmed the weakest content to fit. Undo brings it back.");
  };

  const toggleApplied = async () => {
    const next = !applied;
    setApplied(next);
    const { error } = await actions.setApplied({ id, applied: next });
    if (error) {
      setApplied(!next);
      toast.error(error.message);
    }
  };

  const { basics } = app.doc.resume;
  const contact = [
    basics.email,
    basics.phone,
    basics.location,
    ...basics.links.map((l) => l.url),
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:grid-rows-[auto_1fr] print:block">
      {/* The page size of the PDF follows the paper setting. */}
      <style>{`@page { size: ${paper === "a4" ? "A4" : "letter"}${tab === "letter" ? "; margin: 0.9in 1in" : ""} }`}</style>
      {/* Actions */}
      <div className="grid content-start gap-2 lg:col-start-2 lg:row-start-1 print:hidden">
        <Button
          size="lg"
          disabled={tab === "letter" && app.doc.coverLetter.trim() === ""}
          onClick={() => window.print()}
        >
          <Printer /> Download {tab === "letter" ? "cover letter" : "resume"} as
          PDF
        </Button>
        <p className="-mt-0.5 text-xs text-muted-foreground">
          In the window that opens, choose “Save as PDF”. Links and email are
          clickable.
        </p>
        {applyUrl && (
          <a
            href={applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="press inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent"
          >
            <ExternalLink className="size-4" /> Apply on company site
          </a>
        )}
        <Button
          variant={applied ? "secondary" : "outline"}
          onClick={toggleApplied}
          aria-pressed={applied}
        >
          <Check
            className={cn(
              "transition-all duration-300",
              applied ? "scale-110 text-[var(--tag-green-fg)]" : "opacity-40",
            )}
          />
          {applied ? "Applied" : "Mark as applied"}
        </Button>
      </div>

      {/* The document */}
      <div className="min-w-0 lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <div className="sticky top-12 z-10 -mx-1 mb-3 flex flex-wrap items-center gap-x-1 gap-y-1 bg-background px-1 py-1.5 print:hidden">
          <div
            role="tablist"
            aria-label="Document"
            className="relative mr-2 grid grid-cols-2 rounded-lg bg-muted p-0.5"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-md bg-card shadow-sm transition-transform duration-300 ease-out"
              style={{
                transform: tab === "letter" ? "translateX(100%)" : undefined,
              }}
            />
            {(
              [
                ["resume", "Resume", FileText],
                ["letter", "Cover letter", Mail],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                id={`tab-${value}`}
                type="button"
                role="tab"
                aria-selected={tab === value}
                aria-controls="doc-panel"
                tabIndex={tab === value ? 0 : -1}
                onClick={() => setTab(value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                    const next = value === "resume" ? "letter" : "resume";
                    setTab(next);
                    document.getElementById(`tab-${next}`)?.focus();
                  }
                }}
                className={cn(
                  "relative z-10 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === value ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>
          <UndoRedo {...app} />
          <SaveBadge status={app.status} error={app.error} retry={app.retry} />
          {tab === "resume" && spare !== null && (
            <span
              className={cn(
                "ml-auto inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors duration-300",
                over
                  ? "bg-[var(--callout-yellow)] text-[var(--tag-yellow-fg)]"
                  : "bg-[var(--callout-green)] text-[var(--tag-green-fg)]",
              )}
              aria-live="polite"
            >
              {over ? (
                <TriangleAlert className="size-3.5" />
              ) : (
                <Check className="size-3.5" strokeWidth={3} />
              )}
              {over
                ? `${-spare} ${-spare === 1 ? "line" : "lines"} over ${pages === 2 ? "two pages" : "one page"}`
                : spare === 0
                  ? "Fills the page"
                  : `${pages === 2 ? "Two pages" : "One page"} · ${spare} ${spare === 1 ? "line" : "lines"} spare`}
            </span>
          )}
        </div>

        {tab === "resume" && over && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--callout-yellow)] p-3 text-[var(--tag-yellow-fg)] [animation:rise_0.3s_backwards] print:hidden">
            <p>
              This runs past {pages === 2 ? "two pages" : "one page"}. Trim a
              line or two, or tighten it: we drop the weakest content and you
              can undo it.
            </p>
            <Button variant="outline" onClick={tighten}>
              <Scissors /> Tighten it for me
            </Button>
          </div>
        )}

        <div
          key={tab}
          id="doc-panel"
          role="tabpanel"
          aria-labelledby={`tab-${tab}`}
          className="[animation:rise_0.3s_backwards]"
        >
          {tab === "resume" ? (
            <ResumeSheet
              resume={app.doc.resume}
              edit={editResume}
              mode="page"
              paper={paper}
              pages={pages}
              master={master}
              onFit={setSpare}
            />
          ) : app.doc.coverLetter.trim() === "" ? (
            <div className="mx-auto grid max-w-md justify-items-center gap-3 rounded-xl border bg-card px-6 py-12 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Mail className="size-5" />
              </span>
              <h2 className="text-lg font-semibold">No cover letter yet</h2>
              <p className="text-muted-foreground">
                We write it from your resume and the posting, and check that
                every fact in it is yours.
              </p>
              <CoverLetterWriter
                id={id}
                hasLetter={false}
                onLetter={(letter) =>
                  app.edit(
                    `letter:${Date.now()}`,
                    (d) => (d.coverLetter = letter),
                  )
                }
              />
            </div>
          ) : (
            <>
              <div className="mx-auto mb-2 flex max-w-[var(--paper-w)] justify-end print:hidden">
                <CoverLetterWriter
                  id={id}
                  hasLetter
                  onLetter={(letter) =>
                    app.edit(
                      `letter:${Date.now()}`,
                      (d) => (d.coverLetter = letter),
                    )
                  }
                />
              </div>
              <div
                data-paper={paper}
                className="letter-sheet mx-auto max-w-[var(--paper-w)] rounded-md border bg-white p-6 text-[#111] shadow-[var(--shadow-pop)] sm:px-14 sm:py-12"
              >
                <p className="text-base font-bold">{basics.name}</p>
                {contact && <p className="text-[#444]">{contact}</p>}
                <textarea
                  value={app.doc.coverLetter}
                  onChange={(e) =>
                    app.edit("letter", (d) => (d.coverLetter = e.target.value))
                  }
                  aria-label="Cover letter"
                  className="mt-8 block min-h-[26rem] w-full resize-none bg-transparent text-[0.9375rem] leading-7 outline-none [field-sizing:content] focus-visible:rounded focus-visible:bg-primary/5 focus-visible:ring-4 focus-visible:ring-primary/10"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* What changed and why it fits */}
      <div className="grid content-start gap-4 lg:col-start-2 lg:row-start-2 print:hidden">
        <details open={isNew} className="group rounded-xl border bg-card p-4">
          <summary className="flex cursor-pointer items-center gap-2 font-semibold select-none">
            <Sparkles className="size-4 text-primary" /> What we changed for
            this job
          </summary>
          <ul className="mt-3 grid gap-1.5 text-muted-foreground">
            <li>
              {changes.summary
                ? "Rewrote your summary for this role."
                : "Kept your summary."}
            </li>
            {changes.rewordedJobs + changes.rewordedProjects > 0 ? (
              <li>
                Reworded {changes.rewordedJobs}{" "}
                {changes.rewordedJobs === 1 ? "job" : "jobs"} and{" "}
                {changes.rewordedProjects}{" "}
                {changes.rewordedProjects === 1 ? "project" : "projects"}. They
                have a blue dot.
              </li>
            ) : (
              <li>Kept every bullet as you wrote it.</li>
            )}
            {changes.projectsTotal > changes.projects.length && (
              <li>
                Picked the {changes.projects.length} best of your{" "}
                {changes.projectsTotal} projects: {changes.projects.join(", ")}.
              </li>
            )}
            {changes.skillGroupsTotal > changes.skillGroups && (
              <li>
                Showing the {changes.skillGroups} most relevant of{" "}
                {changes.skillGroupsTotal} skill groups.
              </li>
            )}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Point at a marked job and press the ↺ button to go back to your own
            wording. Your profile is never changed.
          </p>
        </details>
        {aside}
      </div>
    </div>
  );
}
