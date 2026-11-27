import { actions } from "astro:actions";
import { RefreshCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { type Suggestion, suggestionUrl } from "@/lib/suggestions";
import { Button } from "./ui/button";

export default function SuggestedSearches() {
  const [searches, setSearches] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (refresh: boolean) => {
    setLoading(true);
    const { data } = await actions.suggestedSearches({ refresh });
    setSearches(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  if (!(loading || searches?.length)) {
    return null;
  }

  return (
    <section aria-label="Suggested for you" className="mt-8">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="size-4 text-muted-foreground" strokeWidth={1.75} />
        <h2 className="font-semibold">Suggested for you</h2>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          disabled={loading}
          onClick={() => load(true)}
        >
          <RefreshCw className={loading ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>
      <ul
        className={`grid gap-3 transition-opacity duration-300 sm:grid-cols-2 xl:grid-cols-3 ${loading && searches?.length ? "opacity-50" : ""}`}
        aria-busy={loading}
      >
        {loading && !searches?.length
          ? ["a", "b", "c"].map((k) => (
              <li key={k} className="skeleton h-28 rounded-xl" />
            ))
          : searches?.map((s, i) => (
              <li
                key={s.label}
                className="stagger"
                style={{ "--i": i } as React.CSSProperties}
              >
                <a
                  href={suggestionUrl(s)}
                  className="lift flex h-full flex-col gap-1 rounded-xl border bg-card p-4 outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
                >
                  <span className="font-medium">{s.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {s.titles.join(" · ")}
                    {s.remote ? " · remote" : ""}
                  </span>
                  <span className="mt-1 text-muted-foreground">{s.why}</span>
                </a>
              </li>
            ))}
      </ul>
    </section>
  );
}
