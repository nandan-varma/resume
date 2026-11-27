import { actions } from "astro:actions";
import { Check, SearchX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { JobDetail as Data } from "@/lib/job-detail";
import JobDetail, { JobDetailSkeleton } from "./JobDetail";
import CompanyAvatar from "./ui/CompanyAvatar";

type Row = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  workMode: "remote" | "hybrid" | "onsite" | null;
  pay: string | null;
  postedAt: string | null;
  employmentType: string | null;
  locations: number;
};

type Props = { jobs: Row[]; made: string[]; next?: string; capped: boolean };

const modeTag = {
  remote: "tag-green",
  hybrid: "tag-blue",
  onsite: "tag-gray",
} as const;
const WIDE = "(min-width: 1024px)";

/**
 * The search results. On a wide screen the list sits beside the job, so you can
 * scan without losing your place; on a phone each row opens the job page.
 */
export default function ResultsBrowser({ jobs, made, next, capped }: Props) {
  const [wide, setWide] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Data | null>(null);
  const [failed, setFailed] = useState(false);
  const cache = useRef(new Map<string, Data>());
  const pane = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = matchMedia(WIDE);
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Start with the job from the address, else the first result.
  useEffect(() => {
    if (wide && !selected && jobs.length > 0) {
      const wanted = new URL(location.href).searchParams.get("job");
      setSelected(jobs.find((j) => j.id === wanted)?.id ?? jobs[0].id);
    }
  }, [wide, selected, jobs]);

  const load = useCallback(async (id: string) => {
    const hit = cache.current.get(id);
    if (hit) {
      setDetail(hit);
      return;
    }
    setDetail(null);
    setFailed(false);
    const { data } = await actions
      .jobDetail({ id })
      .catch(() => ({ data: undefined }));
    if (data) {
      cache.current.set(id, data);
      setDetail((current) => (selectedRef.current === id ? data : current));
    } else if (selectedRef.current === id) {
      setFailed(true);
    }
  }, []);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  useEffect(() => {
    if (wide && selected) {
      load(selected);
      pane.current?.scrollTo({ top: 0 });
      const url = new URL(location.href);
      url.searchParams.set("job", selected);
      history.replaceState(history.state, "", url);
    }
  }, [wide, selected, load]);

  if (jobs.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center gap-2 text-center text-muted-foreground [animation:rise_0.4s_backwards]">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <SearchX className="size-5" />
        </span>
        <p className="font-medium text-foreground">No jobs found</p>
        <p>Try a broader title, remove a filter, or search a nearby city.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-8">
      <div>
        <ul
          className="grid grid-cols-[minmax(0,1fr)] gap-1.5"
          aria-label="Search results"
        >
          {jobs.map((job, i) => (
            <li
              key={job.id}
              className="stagger min-w-0"
              style={{ "--i": Math.min(i, 10) } as React.CSSProperties}
            >
              <a
                href={`/jobs/${job.id}`}
                aria-current={wide && selected === job.id ? "true" : undefined}
                onClick={(e) => {
                  if (wide && !(e.metaKey || e.ctrlKey || e.shiftKey)) {
                    e.preventDefault();
                    setSelected(job.id);
                  }
                }}
                className={cn(
                  "lift flex gap-3 rounded-lg border bg-card px-3.5 py-3 outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30",
                  wide &&
                    selected === job.id &&
                    "border-primary bg-[color-mix(in_srgb,var(--primary)_6%,var(--card))] shadow-[0_0_0_1px_var(--primary)]",
                )}
              >
                <CompanyAvatar name={job.company} className="mt-0.5" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0 font-medium">{job.title}</span>
                    {made.includes(job.id) && (
                      <span className="tag tag-blue shrink-0 gap-1">
                        <Check className="size-3" strokeWidth={3} />
                        Resume
                      </span>
                    )}
                  </span>
                  <span className="block truncate text-muted-foreground">
                    {job.company}
                    {job.employmentType && ` · ${job.employmentType}`}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
                    {job.workMode && (
                      <span
                        className={cn("tag capitalize", modeTag[job.workMode])}
                      >
                        {job.workMode}
                      </span>
                    )}
                    {job.location && (
                      <span className="truncate">
                        {job.location}
                        {job.locations > 1 && ` +${job.locations - 1}`}
                      </span>
                    )}
                    {job.pay && (
                      <span className="truncate font-medium text-foreground/80">
                        {job.pay}
                      </span>
                    )}
                    {job.postedAt && (
                      <span className="ml-auto text-xs">{job.postedAt}</span>
                    )}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {next && (
            <a
              href={next}
              className="inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Next page
            </a>
          )}
          {capped && (
            <span>
              Results are capped at 300. Narrow the search to see more.
            </span>
          )}
        </p>
      </div>

      {wide && (
        <div
          ref={pane}
          className="sticky top-16 hidden max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-xl border bg-card p-6 lg:block"
        >
          {failed ? (
            <p className="text-muted-foreground">
              This job is no longer listed.
            </p>
          ) : detail && detail.job.id === selected ? (
            <JobDetail key={detail.job.id} data={detail} heading="h2" />
          ) : (
            <JobDetailSkeleton />
          )}
        </div>
      )}
    </div>
  );
}
