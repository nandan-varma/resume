import { actions } from "astro:actions";
import {
  Database,
  Download,
  FileText,
  Keyboard,
  LogOut,
  Palette,
  PenLine,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { PAPERS } from "@/lib/layout";
import { type Prefs, RULES_MAX } from "@/lib/resume";
import { applyTheme, savedTheme, type ThemeChoice } from "@/lib/theme";
import { SaveBadge } from "./EditorBar";
import { Button } from "./ui/button";
import Segmented from "./ui/Segmented";
import { useDoc } from "./useDoc";

type Props = {
  prefs: Prefs;
  user: { name: string; email: string };
  resumes: number;
  credits: { used: number; limit: number; resetsInHours: number };
};

const TONES: Record<Prefs["tone"], { label: string; example: string }> = {
  plain: {
    label: "Plain",
    example: "Built a billing service that processes 1.2M invoices a month.",
  },
  confident: {
    label: "Confident",
    example:
      "Led the billing service rebuild, now processing 1.2M invoices a month with no data loss.",
  },
  warm: {
    label: "Warm",
    example:
      "I loved owning the billing service, which now handles 1.2M invoices a month.",
  },
};

const RULE_IDEAS = [
  "Never use an em dash.",
  "Keep every bullet to one line.",
  "Do not mention my first internship.",
  "Prefer my newest projects.",
];

function Card({
  Icon,
  title,
  hint,
  children,
  tone,
}: {
  Icon: typeof Palette;
  title: string;
  hint?: string;
  children: ReactNode;
  tone?: "danger";
}) {
  return (
    <section
      className={cn(
        "rounded-xl border bg-card p-5 [animation:rise_0.35s_backwards]",
        tone === "danger" &&
          "border-[color-mix(in_srgb,var(--destructive)_40%,var(--border))]",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
            tone === "danger" &&
              "bg-[var(--callout-red)] text-[var(--destructive)]",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="font-semibold">{title}</h2>
          {hint && <p className="text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <div className="mt-4 grid gap-4">{children}</div>
    </section>
  );
}

const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-xs">
    {children}
  </kbd>
);

export default function SettingsPage({ prefs, user, resumes, credits }: Props) {
  const doc = useDoc(prefs, async (p) => {
    const { error } = await actions.savePrefs({ prefs: p });
    return error?.message ?? null;
  });
  const [theme, setTheme] = useState<ThemeChoice>("system");
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => setTheme(savedTheme()), []);

  const pickTheme = (choice: ThemeChoice) => {
    setTheme(choice);
    applyTheme(choice);
  };

  const download = async () => {
    const { data, error } = await actions.exportData();
    if (error || !data) {
      toast.error(
        error?.message ?? "Could not prepare your data. Please try again.",
      );
      return;
    }
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `jobmatch-data-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Your data was downloaded.");
  };

  const remove = async () => {
    setDeleting(true);
    const { error } = await actions.deleteAccount({ confirm: typed });
    if (error) {
      toast.error(error.message);
      setDeleting(false);
      return;
    }
    window.location.assign("/");
  };

  const signOut = async () => {
    const { authClient } = await import("@/lib/auth-client");
    await authClient.signOut();
    window.location.assign("/");
  };

  const rules = doc.doc.rules;
  const matches = typed.trim().toLowerCase() === user.email.toLowerCase();

  return (
    <div className="grid max-w-3xl gap-4">
      <div className="flex h-8 items-center justify-end">
        <SaveBadge status={doc.status} error={doc.error} retry={doc.retry} />
      </div>

      <Card
        Icon={Palette}
        title="Appearance"
        hint="How the app looks on this device."
      >
        <Segmented<ThemeChoice>
          legend="Theme"
          name="theme"
          value={theme}
          onChange={pickTheme}
          options={[
            { value: "system", label: "Match my device" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </Card>

      <Card
        Icon={FileText}
        title="Paper and length"
        hint="Used for the page you edit, the page-fit meter, the AI's budget and the PDF."
      >
        <Segmented<Prefs["paper"]>
          legend="Paper size"
          name="paper"
          value={doc.doc.paper}
          onChange={(paper) => doc.edit("paper", (d) => (d.paper = paper))}
          options={[
            { value: "a4", label: PAPERS.a4.label, hint: "210 × 297 mm" },
            {
              value: "letter",
              label: PAPERS.letter.label,
              hint: "8.5 × 11 in",
            },
          ]}
        />
        <Segmented<"1" | "2">
          legend="Length"
          name="pages"
          value={String(doc.doc.pages) as "1" | "2"}
          onChange={(v) =>
            doc.edit("pages", (d) => {
              d.pages = v === "2" ? 2 : 1;
            })
          }
          options={[
            { value: "1", label: "One page", hint: "Best for early careers" },
            {
              value: "2",
              label: "Up to two pages",
              hint: "For 10+ years of experience",
            },
          ]}
        />
        <p className="text-muted-foreground">
          Resumes you already made are laid out again. Check the page meter on
          each one.
        </p>
      </Card>

      <Card
        Icon={PenLine}
        title="Writing style"
        hint="Used whenever we write a resume or cover letter for you."
      >
        <Segmented<Prefs["tone"]>
          legend="Tone"
          name="tone"
          value={doc.doc.tone}
          onChange={(tone) => doc.edit("tone", (d) => (d.tone = tone))}
          options={(Object.keys(TONES) as Prefs["tone"][]).map((value) => ({
            value,
            label: TONES[value].label,
          }))}
        />
        <p
          key={doc.doc.tone}
          className="rounded-lg bg-callout p-3 text-muted-foreground [animation:fade_0.25s_backwards]"
        >
          <span className="font-medium text-foreground">Sounds like: </span>
          {TONES[doc.doc.tone].example}
        </p>

        <div className="grid gap-1.5">
          <label htmlFor="rules" className="font-medium">
            Your own rules{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </label>
          <textarea
            id="rules"
            value={rules}
            maxLength={RULES_MAX}
            onChange={(e) =>
              doc.edit("rules", (d) => (d.rules = e.target.value))
            }
            placeholder='For example: "Never mention my first internship."'
            className="field h-auto min-h-24 resize-none py-2 leading-relaxed [field-sizing:content]"
          />
          <div className="flex flex-wrap items-center gap-1.5">
            {RULE_IDEAS.filter((idea) => !rules.includes(idea)).map((idea) => (
              <button
                key={idea}
                type="button"
                disabled={rules.length + idea.length + 1 > RULES_MAX}
                onClick={() =>
                  doc.edit(`rules-add:${idea}`, (d) => {
                    d.rules = `${d.rules.trim()}${d.rules.trim() ? " " : ""}${idea}`;
                  })
                }
                className="press rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
              >
                + {idea}
              </button>
            ))}
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {rules.length}/{RULES_MAX}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            We follow these unless they would mean saying something untrue.
          </p>
        </div>
      </Card>

      <Card Icon={UserRound} title="Account">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted font-semibold">
            {(user.name || user.email).charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {user.name || "Your account"}
            </p>
            <p className="truncate text-muted-foreground">{user.email}</p>
          </div>
          <Button variant="outline" onClick={signOut}>
            <LogOut /> Sign out
          </Button>
        </div>
      </Card>

      <Card
        Icon={Sparkles}
        title="AI use today"
        hint="Writing a resume or letter, and reading an uploaded resume, each use one. Editing and downloading never do."
      >
        <div className="flex items-center gap-3">
          <div
            className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={credits.used}
            aria-valuemin={0}
            aria-valuemax={credits.limit}
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-700",
                credits.used >= credits.limit ? "bg-destructive" : "bg-primary",
              )}
              style={{
                width: `${Math.min(100, (credits.used / credits.limit) * 100)}%`,
              }}
            />
          </div>
          <span className="text-muted-foreground tabular-nums">
            {credits.used} of {credits.limit}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Resets at midnight UTC, in about {credits.resetsInHours}{" "}
          {credits.resetsInHours === 1 ? "hour" : "hours"}.
        </p>
      </Card>

      <Card Icon={Keyboard} title="Shortcuts">
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {(
            [
              ["Jump to a page or resume", <Kbd key="a">⌘ K</Kbd>],
              ["Undo", <Kbd key="b">⌘ Z</Kbd>],
              ["Redo", <Kbd key="c">⇧ ⌘ Z</Kbd>],
              ["New bullet, split at the cursor", <Kbd key="d">Enter</Kbd>],
              ["Join with the bullet above", <Kbd key="e">Backspace</Kbd>],
              ["Move between lines", <Kbd key="f">↑ ↓</Kbd>],
            ] as const
          ).map(([label, keys]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3"
            >
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{keys}</dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          On Windows and Linux, use Ctrl instead of ⌘.
        </p>
      </Card>

      <Card
        Icon={Database}
        title="Your data"
        hint={`${resumes} ${resumes === 1 ? "resume" : "resumes"} and your profile. We keep nothing else: uploaded PDFs are never stored.`}
      >
        <div>
          <Button variant="outline" onClick={download}>
            <Download /> Download my data
          </Button>
        </div>
      </Card>

      <Card
        Icon={ShieldAlert}
        tone="danger"
        title="Delete account"
        hint="Permanently deletes your profile, every resume and your sign-in. This cannot be undone."
      >
        {!confirming ? (
          <div>
            <Button variant="destructive" onClick={() => setConfirming(true)}>
              <Trash2 /> Delete my account…
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 [animation:rise_0.25s_backwards]">
            <p>
              You are about to delete {resumes}{" "}
              {resumes === 1 ? "resume" : "resumes"} and your profile.{" "}
              <button
                type="button"
                onClick={download}
                className="font-medium underline underline-offset-2"
              >
                Download a copy first
              </button>
              .
            </p>
            <label className="grid gap-1.5">
              <span className="font-medium">
                Type{" "}
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                  {user.email}
                </span>{" "}
                to confirm
              </span>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="field"
                aria-label="Type your email to confirm"
              />
            </label>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                disabled={!matches || deleting}
                onClick={remove}
                className={cn(
                  matches &&
                    "bg-destructive text-white hover:bg-destructive/90",
                )}
              >
                <Trash2 /> {deleting ? "Deleting…" : "Delete everything"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setConfirming(false);
                  setTyped("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      <p className="pb-4 text-center text-xs text-muted-foreground">
        Job listings come from{" "}
        <a
          href="https://tallo.nandan.fyi"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          Tallo
        </a>
        .
      </p>
    </div>
  );
}
