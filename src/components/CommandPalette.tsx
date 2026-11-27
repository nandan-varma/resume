import { actions } from "astro:actions";
import { navigate } from "astro:transitions/client";
import { FileText, Search, Settings, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Item = {
  href: string;
  label: string;
  hint?: string;
  kind: "page" | "resume";
};

const PAGES: Item[] = [
  { href: "/", label: "Find jobs", kind: "page" },
  { href: "/resumes", label: "My resumes", kind: "page" },
  { href: "/profile", label: "Profile", kind: "page" },
  { href: "/settings", label: "Settings", kind: "page" },
];

/** ⌘K (or Ctrl+K): jump to a page or to one of your resumes. */
export default function CommandPalette({ signedIn }: { signedIn: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [resumes, setResumes] = useState<Item[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-palette", onOpen);
    };
  }, []);

  useEffect(() => {
    const el = dialog.current;
    if (!el) {
      return;
    }
    if (open && !el.open) {
      el.showModal();
      setQuery("");
      setCursor(0);
      if (signedIn) {
        actions.listResumes().then(({ data }) =>
          setResumes(
            (data ?? []).map((r) => ({
              href: `/resumes/${r.id}`,
              label: r.role,
              hint: r.company,
              kind: "resume" as const,
            })),
          ),
        );
      }
    } else if (!open && el.open) {
      el.close();
    }
  }, [open, signedIn]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...PAGES, ...resumes].filter((i) =>
      `${i.label} ${i.hint ?? ""}`.toLowerCase().includes(q),
    );
  }, [query, resumes]);

  const go = (item?: Item) => {
    if (item) {
      setOpen(false);
      navigate(item.href);
    }
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape already closes a dialog; the click only dismisses by the backdrop
    <dialog
      ref={dialog}
      onClose={() => setOpen(false)}
      onClick={(e) => e.target === dialog.current && setOpen(false)}
      aria-label="Quick jump"
      className="m-auto mt-[12vh] w-[min(34rem,calc(100vw-2rem))] rounded-xl border bg-popover p-0 text-popover-foreground shadow-[var(--shadow-pop)] backdrop:bg-black/30"
    >
      <div className="flex items-center gap-2 border-b px-3">
        <Search className="size-4 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setCursor(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setCursor((c) => Math.min(c + 1, items.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setCursor((c) => Math.max(c - 1, 0));
            } else if (e.key === "Enter") {
              go(items[cursor]);
            }
          }}
          placeholder="Go to a page or a resume…"
          aria-label="Go to"
          className="h-11 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
        <kbd className="rounded border px-1.5 text-xs text-muted-foreground">
          esc
        </kbd>
      </div>
      <ul className="max-h-72 overflow-y-auto p-1.5">
        {items.length === 0 && (
          <li className="px-2.5 py-6 text-center text-muted-foreground">
            Nothing matches.
          </li>
        )}
        {items.map((item, i) => (
          <li key={item.href}>
            <a
              href={item.href}
              onClick={() => setOpen(false)}
              onMouseMove={() => setCursor(i)}
              className={cn(
                "flex items-center gap-2 rounded-md px-2.5 py-2",
                i === cursor && "bg-accent",
              )}
            >
              {item.kind === "resume" ? (
                <FileText className="size-4 text-muted-foreground" />
              ) : item.label === "Profile" ? (
                <UserRound className="size-4 text-muted-foreground" />
              ) : item.label === "Settings" ? (
                <Settings className="size-4 text-muted-foreground" />
              ) : (
                <Search className="size-4 text-muted-foreground" />
              )}
              <span className="truncate">{item.label}</span>
              {item.hint && (
                <span className="truncate text-muted-foreground">
                  {item.hint}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>
    </dialog>
  );
}
