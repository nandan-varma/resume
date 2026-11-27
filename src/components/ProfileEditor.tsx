import { actions } from "astro:actions";
import {
  ArrowRight,
  Check,
  ClipboardPaste,
  FileUp,
  PenLine,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { completeness, type Prefs, type Resume } from "@/lib/resume";
import { SaveBadge, UndoRedo } from "./EditorBar";
import ResumeSheet from "./ResumeSheet";
import { Button } from "./ui/button";
import { buttonVariants } from "./ui/variants";
import { useDoc } from "./useDoc";
import WorkOverlay, { IMPORT_STEPS } from "./WorkOverlay";

type Props = { resume: Resume; prefs: Prefs; welcome: boolean };

const TONES = [
  { value: "plain", label: "Plain", hint: "Clear and direct" },
  { value: "confident", label: "Confident", hint: "Bold and assured" },
  { value: "warm", label: "Warm", hint: "Friendly and human" },
] as const;

const Panel = ({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <section className="rounded-xl border bg-card p-4">
    <h3 className="font-semibold">{title}</h3>
    {hint && <p className="mt-0.5 mb-3 text-muted-foreground">{hint}</p>}
    {!hint && <div className="mb-3" />}
    {children}
  </section>
);

const area =
  "field h-auto min-h-16 resize-none py-2 leading-relaxed [field-sizing:content]";

export default function ProfileEditor({ resume, prefs, welcome }: Props) {
  const master = useDoc(resume, async (r) => {
    const { error } = await actions.saveResume({ resume: r });
    return error?.message ?? null;
  });
  const style = useDoc(prefs, async (p) => {
    const { error } = await actions.savePrefs({ prefs: p });
    return error?.message ?? null;
  });

  const [phase, setPhase] = useState<"welcome" | "reading" | "editing">(
    welcome ? "welcome" : "editing",
  );
  const [finished, setFinished] = useState(false);
  const [imported, setImported] = useState(false);
  const [paste, setPaste] = useState(false);
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const takeResult = (data: Resume) => {
    master.edit("import", (draft) => Object.assign(draft, data));
    setImported(true);
    setFinished(true);
  };

  const reading = useRef(false);
  /** Runs an import, once at a time, and always returns to a usable screen on failure. */
  const importWith = async (
    run: () => Promise<{ data?: Resume; error?: { message: string } }>,
  ) => {
    if (reading.current) {
      return;
    }
    reading.current = true;
    setPhase("reading");
    setFinished(false);
    try {
      const { data, error } = await run();
      if (error || !data) {
        throw new Error(error?.message);
      }
      takeResult(data);
    } catch (e) {
      toast.error(
        e instanceof Error && e.message
          ? e.message
          : "Something went wrong. Please try again.",
      );
      setPhase(welcome ? "welcome" : "editing");
    } finally {
      reading.current = false;
    }
  };

  const readFile = (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Please choose a PDF file.");
      return;
    }
    const form = new FormData();
    form.set("file", file);
    return importWith(() => actions.importResume(form));
  };

  const readText = () => importWith(() => actions.importResumeText({ text }));

  const { doc } = master;
  const progress = completeness(doc);

  const jumpTo = (id: string) => {
    if (id === "contact") {
      const key = doc.basics.name ? "basics.email" : "basics.name";
      document.querySelector<HTMLElement>(`[data-fk="${key}"]`)?.focus();
      return;
    }
    const chip = {
      work: "Experience",
      projects: "Projects",
      skills: "Skills",
      summary: "Summary",
    }[id];
    [...document.querySelectorAll<HTMLButtonElement>(".rs-sections button")]
      .find((b) => b.textContent?.includes(chip ?? "—"))
      ?.click();
  };

  const fileInput = (
    <input
      ref={input}
      type="file"
      accept="application/pdf"
      hidden
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) {
          readFile(file);
        }
      }}
    />
  );

  if (phase === "reading") {
    return (
      <WorkOverlay
        title="Reading your resume"
        hint="We read it once to fill things in. The file itself is never kept."
        steps={IMPORT_STEPS}
        done={finished}
        onDone={() => setPhase("editing")}
      />
    );
  }

  if (phase === "welcome") {
    return (
      <div className="mx-auto max-w-2xl [animation:rise_0.4s_backwards]">
        {fileInput}
        <ol
          className="mb-6 flex items-center gap-2 text-xs text-muted-foreground"
          aria-label="Steps"
        >
          {["Add your details", "Find a job", "Get your resume"].map((s, i) => (
            <li
              key={s}
              className={cn(
                "flex items-center gap-2",
                i === 0 && "font-medium text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border text-[0.6875rem]",
                  i === 0 &&
                    "border-primary bg-primary text-primary-foreground",
                )}
              >
                {i + 1}
              </span>
              {s}
              {i < 2 && <span className="h-px w-6 bg-border" />}
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() => input.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file) {
              readFile(file);
            }
          }}
          className={cn(
            "group flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed bg-card px-6 py-12 text-center transition-all duration-200",
            dragging
              ? "scale-[1.01] border-primary bg-[color-mix(in_srgb,var(--primary)_6%,var(--card))]"
              : "hover:border-primary/60 hover:bg-accent/40",
          )}
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform duration-300 group-hover:-translate-y-1 group-hover:text-primary">
            <FileUp className="size-6" />
          </span>
          <span className="text-lg font-semibold">Drop your resume here</span>
          <span className="text-muted-foreground">
            or click to choose a PDF. We fill everything in for you.
          </span>
        </button>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPaste((p) => !p)}
            aria-expanded={paste}
          >
            <ClipboardPaste /> Paste text instead
          </Button>
          <Button variant="ghost" onClick={() => setPhase("editing")}>
            <PenLine /> Start from scratch
          </Button>
        </div>

        <ul className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
          {[
            "We read it once, the file is not kept",
            "We never invent facts",
            "You can edit every line",
          ].map((t) => (
            <li key={t} className="flex items-center gap-1.5">
              <Check
                className="size-3.5 text-[var(--tag-green-fg)]"
                strokeWidth={3}
              />{" "}
              {t}
            </li>
          ))}
        </ul>

        {paste && (
          <div className="mt-4 grid gap-2 [animation:rise_0.25s_backwards]">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your resume or LinkedIn profile text here"
              aria-label="Resume text"
              className={cn(area, "min-h-40")}
            />
            <Button
              disabled={text.trim().length < 50}
              onClick={readText}
              className="w-fit"
            >
              <Sparkles /> Fill it in for me
            </Button>
          </div>
        )}
      </div>
    );
  }

  const done = progress.done;
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
      {fileInput}
      <div className="min-w-0 [animation:rise_0.4s_backwards]">
        <div className="sticky top-12 z-10 -mx-1 mb-3 flex items-center gap-1 bg-background px-1 py-1.5">
          <UndoRedo {...master} />
          <SaveBadge
            status={master.status}
            error={master.error}
            retry={master.retry}
          />
          <span className="ml-auto hidden text-xs text-muted-foreground sm:inline">
            Click any text to edit it
          </span>
        </div>
        <ResumeSheet
          resume={doc}
          edit={master.edit}
          mode="flow"
          paper={prefs.paper}
        />
      </div>

      <aside className="grid content-start gap-4 lg:sticky lg:top-24 lg:self-start">
        {imported && (
          <div className="relative rounded-xl bg-[var(--callout-blue)] p-4 text-[var(--tag-blue-fg)] [animation:pop_0.4s_backwards]">
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setImported(false)}
              className="absolute top-2 right-2 rounded p-1 hover:bg-black/5"
            >
              <X className="size-4" />
            </button>
            <p className="font-semibold">Here is what we found</p>
            <p className="mt-1">
              Click any line on the page to fix it. When it looks right, you are
              ready to search.
            </p>
          </div>
        )}

        <Panel title="Your profile">
          <div className="mb-3 flex items-center gap-3">
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={done}
              aria-valuemin={0}
              aria-valuemax={progress.steps.length}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out"
                style={{ width: `${(done / progress.steps.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {done}/{progress.steps.length}
            </span>
          </div>
          <ul className="grid gap-1">
            {progress.steps.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={s.done}
                  onClick={() => jumpTo(s.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors",
                    !s.done && "hover:bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border transition-colors duration-300",
                      s.done &&
                        "border-transparent bg-primary text-primary-foreground",
                    )}
                  >
                    {s.done ? (
                      <Check
                        className="size-3 [animation:pop_0.3s_backwards]"
                        strokeWidth={3}
                      />
                    ) : (
                      <Plus className="size-3 text-muted-foreground" />
                    )}
                  </span>
                  <span
                    className={cn(
                      s.done &&
                        "text-muted-foreground line-through decoration-muted-foreground/40",
                    )}
                  >
                    {s.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <a
            href="/"
            className={cn(
              buttonVariants({
                size: "lg",
                variant: done >= 3 ? "default" : "outline",
              }),
              "mt-4 w-full",
            )}
          >
            Find jobs <ArrowRight />
          </a>
        </Panel>

        <Panel
          title="How should it sound?"
          hint="Used whenever we write for you."
        >
          <fieldset className="m-0 grid min-w-0 grid-cols-3 gap-1 rounded-lg border-0 bg-muted p-1">
            <legend className="sr-only">Tone</legend>
            {TONES.map((t) => (
              <label
                key={t.value}
                title={t.hint}
                className={cn(
                  "cursor-pointer rounded-md py-1.5 text-center text-sm font-medium transition-all duration-200 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-primary/30",
                  style.doc.tone === t.value
                    ? "bg-card shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <input
                  type="radio"
                  name="tone"
                  value={t.value}
                  checked={style.doc.tone === t.value}
                  onChange={() => style.edit("tone", (d) => (d.tone = t.value))}
                  className="sr-only"
                />
                {t.label}
              </label>
            ))}
          </fieldset>
          <textarea
            value={style.doc.rules}
            onChange={(e) =>
              style.edit("rules", (d) => (d.rules = e.target.value))
            }
            placeholder='Your own rules, e.g. "Never mention my first internship."'
            aria-label="Your own rules"
            className={cn(area, "mt-3")}
          />
          <div className="mt-1 flex justify-end">
            <SaveBadge
              status={style.status}
              error={style.error}
              retry={style.retry}
            />
          </div>
        </Panel>

        <Panel
          title="Summary options"
          hint="A few versions for different kinds of jobs. We pick the closest and tweak a word or two."
        >
          <div className="grid gap-2">
            {doc.summaries.map((s, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: plain strings have no id
                key={i}
                className="group relative [animation:pop_0.25s_backwards]"
              >
                <textarea
                  value={s}
                  onChange={(e) =>
                    master.edit(
                      `summaries.${i}`,
                      (d) => (d.summaries[i] = e.target.value),
                    )
                  }
                  aria-label={`Summary version ${i + 1}`}
                  className={cn(area, "pr-8")}
                />
                <button
                  type="button"
                  aria-label="Remove this version"
                  onClick={() =>
                    master.edit(`summaries-del:${Date.now()}`, (d) =>
                      d.summaries.splice(i, 1),
                    )
                  }
                  className="absolute top-1.5 right-1.5 rounded p-1 text-muted-foreground opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-accent"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() =>
                master.edit(`summaries-add:${Date.now()}`, (d) =>
                  d.summaries.push(""),
                )
              }
            >
              <Plus /> Add a version
            </Button>
          </div>
        </Panel>

        <Panel
          title="Private notes"
          hint="Never printed. Work authorization, deal-breakers, anything the writer should know."
        >
          <textarea
            value={doc.notes}
            onChange={(e) =>
              master.edit("notes", (d) => (d.notes = e.target.value))
            }
            aria-label="Private notes"
            className={area}
          />
        </Panel>

        <details className="group rounded-xl border bg-card px-4 py-3">
          <summary className="cursor-pointer text-muted-foreground select-none">
            Replace with a different resume
          </summary>
          <p className="mt-2 mb-3 text-muted-foreground">
            This fills in the page again. You can undo it right after.
          </p>
          <Button variant="outline" onClick={() => input.current?.click()}>
            <FileUp /> Upload a PDF
          </Button>
        </details>
      </aside>
    </div>
  );
}
