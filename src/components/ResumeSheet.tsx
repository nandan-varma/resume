import {
  ChevronDown,
  ChevronUp,
  Plus,
  RotateCcw,
  Wrench,
  X,
} from "lucide-react";
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";
import type { Paper } from "@/lib/layout";
import { Resume } from "@/lib/resume";
import { isReworded, originalProject, originalWork } from "@/lib/resume-diff";
import { caretOffset, Editable, setCaret } from "./Editable";

export type Edit = (key: string, change: (draft: Resume) => void) => void;

type Props = {
  resume: Resume;
  edit: Edit;
  /** "page" is one page of paper; "flow" grows with the content (the master resume). */
  mode: "page" | "flow";
  paper: Paper;
  /** The master resume. When given, reworded jobs and projects are marked and can be restored. */
  master?: Resume;
  /** Called after each change with how many lines are spare (negative: over the page). */
  onFit?: (spareLines: number) => void;
};

const blank = {
  work: () => Resume.parse({ work: [{}] }).work[0],
  project: () => Resume.parse({ projects: [{}] }).projects[0],
  skill: () => Resume.parse({ skills: [{}] }).skills[0],
  education: () => Resume.parse({ education: [{}] }).education[0],
  leadership: () => Resume.parse({ leadership: [{}] }).leadership[0],
};

/** Fields that are simply left out of the printed line when empty. */
const OPTIONAL =
  /\.(email|phone|location|start|end|year|url|stack|dates|details)$/;

const stamp = (what: string) => `${what}:${Date.now()}`;

const move = (items: unknown[], from: number, by: number) => {
  const to = from + by;
  if (to >= 0 && to < items.length) {
    [items[from], items[to]] = [items[to], items[from]];
  }
};

/** Text pieces on one line; a separator shows between pieces that have text (always on screen, only when needed in print). */
function Join({
  parts,
}: {
  parts: { value: string; node: ReactNode; sep?: string }[];
}) {
  let seen = false;
  return (
    <>
      {parts.map((p, i) => {
        const showSep = i > 0 && p.sep;
        const needed = seen && p.value.trim() !== "";
        seen ||= p.value.trim() !== "";
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: parts are a fixed list
          <span key={i}>
            {showSep && (
              <span className={cn("rs-sep", !needed && "rs-ghost")}>
                {p.sep}
              </span>
            )}
            {p.node}
          </span>
        );
      })}
    </>
  );
}

type ToolProps = {
  onUp?: () => void;
  onDown?: () => void;
  onAdd?: () => void;
  addLabel?: string;
  onRestore?: () => void;
  onExtra?: () => void;
  extraLabel?: string;
  onDelete: () => void;
};

/** Small buttons in the page margin, shown while you point at or edit an item. */
function Tools({
  onUp,
  onDown,
  onAdd,
  addLabel,
  onRestore,
  onExtra,
  extraLabel,
  onDelete,
}: ToolProps) {
  const btn = (label: string, run: (() => void) | undefined, icon: ReactNode) =>
    run && (
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={run}
        className="rs-tool"
      >
        {icon}
      </button>
    );
  return (
    <div className="rs-tools rs-np">
      {btn("Move up", onUp, <ChevronUp />)}
      {btn("Move down", onDown, <ChevronDown />)}
      {btn(addLabel ?? "Add", onAdd, <Plus />)}
      {btn("Use my original wording", onRestore, <RotateCcw />)}
      {btn(extraLabel ?? "More", onExtra, <Wrench />)}
      {btn("Remove", onDelete, <X />)}
    </div>
  );
}

function Section({
  title,
  addLabel,
  onAdd,
  children,
}: {
  title: string;
  addLabel: string;
  onAdd: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rs-section">
      <h2>
        {title}
        <button type="button" onClick={onAdd} className="rs-add rs-np">
          <Plus /> {addLabel}
        </button>
      </h2>
      {children}
    </section>
  );
}

export default function ResumeSheet({
  resume,
  edit,
  mode,
  paper,
  master,
  onFit,
}: Props) {
  const { basics, work, education, projects, skills, leadership } = resume;
  const root = useRef<HTMLDivElement>(null);
  // Once the summary is on the page it stays there while you edit it, even if you clear it.
  const [summaryOpen, setSummaryOpen] = useState(basics.summary !== "");
  const showSummary = summaryOpen || basics.summary !== "";
  const focusNext = useRef<{ key: string; at: number | "end" } | null>(null);
  // Lines that take a whole row (headline, project tools) only appear once there is text or you ask for them.
  const [open, setOpen] = useState<Set<string>>(new Set());
  const reveal = (key: string, on: boolean, value = "") => {
    if (key !== "basics.headline" && !/\.stack$/.test(key)) {
      return;
    }
    if (on === open.has(key) || (!on && value !== "")) {
      return;
    }
    setOpen((s) => {
      const next = new Set(s);
      if (on) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  };
  const showLine = (key: string, value: string) =>
    value !== "" || open.has(key);
  const askFor = (key: string) => {
    focusNext.current = { key, at: "end" };
    setOpen((s) => new Set(s).add(key));
  };

  // After a row is added or changed, put the cursor where it belongs.
  useEffect(() => {
    const target = focusNext.current;
    if (!target) {
      return;
    }
    focusNext.current = null;
    const el = root.current?.querySelector<HTMLElement>(
      `[data-fk="${target.key}"]`,
    );
    if (el) {
      el.focus();
      setCaret(el, target.at);
    }
  });

  const add = (
    what: string,
    key: string,
    change: (r: Resume) => void,
    at: number | "end" = "end",
  ) => {
    focusNext.current = { key, at };
    edit(stamp(what), change);
  };

  // Arrow keys move between lines when the cursor is at the very start or end of one.
  const onArrow = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>(".rs-ed");
    if (
      !el ||
      e.shiftKey ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey ||
      e.nativeEvent.isComposing
    ) {
      return;
    }
    const up = e.key === "ArrowUp";
    if (!(up || e.key === "ArrowDown")) {
      return;
    }
    const caret = caretOffset(el);
    const length = (el.textContent ?? "").length;
    if (caret === null || (up ? caret !== 0 : caret !== length)) {
      return;
    }
    const fields = [
      ...(root.current?.querySelectorAll<HTMLElement>(".rs-ed") ?? []),
    ].filter((f) => f.offsetWidth > 0 || f.offsetHeight > 0);
    const next = fields[fields.indexOf(el) + (up ? -1 : 1)];
    if (next) {
      e.preventDefault();
      next.focus();
      setCaret(next, up ? "end" : 0);
    }
  };

  /** A text field wired to one place in the resume. */
  const field = (
    key: string,
    value: string,
    set: (r: Resume, v: string) => void,
    label: string,
    className?: string,
  ) => (
    <Editable
      fk={key}
      label={label}
      className={className}
      value={value}
      optional={OPTIONAL.test(key)}
      onChange={(v) => edit(key, (r) => set(r, v))}
      onFocus={() => reveal(key, true)}
      onBlur={() => reveal(key, false, value)}
    />
  );

  const bullets = (kind: "work" | "projects", i: number, lines: string[]) => (
    <ul>
      {lines.map((line, j) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: bullets have no id; the editor syncs text by position
        <li key={j}>
          <Editable
            fk={`${kind}.${i}.h.${j}`}
            label="Describe what you achieved"
            value={line}
            onChange={(v) =>
              edit(`${kind}.${i}.h.${j}`, (r) => {
                r[kind][i].highlights[j] = v;
              })
            }
            // Enter splits the bullet at the cursor.
            onEnter={(caret) =>
              add(
                "bullet",
                `${kind}.${i}.h.${j + 1}`,
                (r) => {
                  const lines = r[kind][i].highlights;
                  const text = lines[j] ?? "";
                  lines[j] = text.slice(0, caret).trimEnd();
                  lines.splice(j + 1, 0, text.slice(caret).trimStart());
                },
                0,
              )
            }
            // Backspace at the start joins this bullet onto the one above (or removes an empty one).
            onBackspaceAtStart={(empty) => {
              if (j === 0 && !empty) {
                return;
              }
              const before = lines[j - 1] ?? "";
              add(
                "bullet-join",
                `${kind}.${i}.h.${Math.max(j - 1, 0)}`,
                (r) => {
                  const list = r[kind][i].highlights;
                  if (j > 0) {
                    list[j - 1] = [before, list[j]].filter(Boolean).join(" ");
                  }
                  list.splice(j, 1);
                },
                j > 0 ? before.length : "end",
              );
            }}
          />
        </li>
      ))}
    </ul>
  );

  const itemTools = (
    list: "work" | "projects" | "education" | "leadership" | "skills",
    i: number,
    extra: Partial<ToolProps> = {},
  ) => (
    <Tools
      onUp={
        i > 0
          ? () => edit(stamp("move"), (r) => move(r[list], i, -1))
          : undefined
      }
      onDown={
        i < resume[list].length - 1
          ? () => edit(stamp("move"), (r) => move(r[list], i, 1))
          : undefined
      }
      onDelete={() => edit(stamp("remove"), (r) => r[list].splice(i, 1))}
      {...extra}
    />
  );

  const addBullet = (kind: "work" | "projects", i: number) => () =>
    add(
      "bullet",
      `${kind}.${i}.h.${resume[kind][i].highlights.length}`,
      (r) => {
        r[kind][i].highlights.push("");
      },
    );

  const missing = [
    !showSummary && "Summary",
    work.length === 0 && "Experience",
    projects.length === 0 && "Projects",
    skills.length === 0 && "Skills",
    leadership.length === 0 && "Leadership",
    education.length === 0 && "Education",
  ].filter(Boolean) as string[];

  const addSection = (name: string) => {
    switch (name) {
      case "Summary":
        focusNext.current = { key: "basics.summary", at: "end" };
        return setSummaryOpen(true);
      case "Experience":
        return add("section", "work.0.position", (r) =>
          r.work.push(blank.work()),
        );
      case "Projects":
        return add("section", "projects.0.name", (r) =>
          r.projects.push(blank.project()),
        );
      case "Skills":
        return add("section", "skills.0.group", (r) =>
          r.skills.push(blank.skill()),
        );
      case "Leadership":
        return add("section", "leadership.0.role", (r) =>
          r.leadership.push(blank.leadership()),
        );
      default:
        return add("section", "education.0.school", (r) =>
          r.education.push(blank.education()),
        );
    }
  };

  return (
    <Frame mode={mode} paper={paper} resume={resume} onFit={onFit}>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: arrow keys bubble up from the editable fields inside */}
      <div
        ref={root}
        id="resume-content"
        onKeyDown={onArrow}
        role="presentation"
      >
        <header className="rs-head">
          <div className="rs-header-add rs-np">
            {(
              [
                [
                  "basics.headline",
                  "Headline",
                  basics.headline === "" && !open.has("basics.headline"),
                ],
                ["basics.email", "Email", basics.email === ""],
                ["basics.phone", "Phone", basics.phone === ""],
                ["basics.location", "Location", basics.location === ""],
              ] as const
            )
              .filter(([, , missing]) => missing)
              .map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (key === "basics.headline") {
                      askFor(key);
                    } else {
                      root.current
                        ?.querySelector<HTMLElement>(`[data-fk="${key}"]`)
                        ?.focus();
                    }
                  }}
                >
                  <Plus /> {label}
                </button>
              ))}
            <button
              type="button"
              onClick={() =>
                add("link", `basics.links.${basics.links.length}`, (r) => {
                  r.basics.links.push({ label: "", url: "" });
                })
              }
            >
              <Plus /> Link
            </button>
          </div>
          <h1>
            {field(
              "basics.name",
              basics.name,
              (r, v) => (r.basics.name = v),
              "Your name",
            )}
          </h1>
          {showLine("basics.headline", basics.headline) && (
            <p className={cn("rs-headline", !basics.headline && "rs-np")}>
              {field(
                "basics.headline",
                basics.headline,
                (r, v) => (r.basics.headline = v),
                "Headline, e.g. Backend engineer",
              )}
            </p>
          )}
          <p className="rs-contact">
            <Join
              parts={[
                {
                  value: basics.email,
                  node: field(
                    "basics.email",
                    basics.email,
                    (r, v) => (r.basics.email = v),
                    "Email",
                  ),
                },
                {
                  value: basics.phone,
                  sep: " · ",
                  node: field(
                    "basics.phone",
                    basics.phone,
                    (r, v) => (r.basics.phone = v),
                    "Phone",
                  ),
                },
                {
                  value: basics.location,
                  sep: " · ",
                  node: field(
                    "basics.location",
                    basics.location,
                    (r, v) => (r.basics.location = v),
                    "City, State",
                  ),
                },
                ...basics.links.map((l, i) => ({
                  value: l.url,
                  sep: " · ",
                  node: (
                    <span className="rs-link">
                      {field(
                        `basics.links.${i}`,
                        l.url,
                        (r, v) => (r.basics.links[i].url = v),
                        "Link, e.g. github.com/you",
                      )}
                      <button
                        type="button"
                        aria-label="Remove link"
                        title="Remove link"
                        className="rs-x rs-np"
                        onClick={() =>
                          edit(stamp("remove"), (r) =>
                            r.basics.links.splice(i, 1),
                          )
                        }
                      >
                        <X />
                      </button>
                    </span>
                  ),
                })),
              ]}
            />
          </p>
        </header>

        {showSummary && (
          <section className={cn("rs-section", !basics.summary && "rs-np")}>
            <h2>Summary</h2>
            <p>
              {field(
                "basics.summary",
                basics.summary,
                (r, v) => (r.basics.summary = v),
                "Two or three lines about you",
              )}
            </p>
          </section>
        )}

        {work.length > 0 && (
          <Section
            title="Experience"
            addLabel="Add job"
            onAdd={() =>
              add("job", `work.${work.length}.position`, (r) =>
                r.work.push(blank.work()),
              )
            }
          >
            {work.map((job, i) => {
              const original = master && originalWork(master, job);
              const changed = isReworded(original, job);
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id
                <article key={i} data-changed={changed || undefined}>
                  {itemTools("work", i, {
                    onAdd: addBullet("work", i),
                    addLabel: "Add a bullet",
                    onRestore:
                      changed && original
                        ? () =>
                            edit(
                              stamp("restore"),
                              (r) =>
                                (r.work[i].highlights = [
                                  ...original.highlights,
                                ]),
                            )
                        : undefined,
                  })}
                  <div className="row">
                    <p>
                      <Join
                        parts={[
                          {
                            value: job.position,
                            node: (
                              <strong>
                                {field(
                                  `work.${i}.position`,
                                  job.position,
                                  (r, v) => (r.work[i].position = v),
                                  "Job title",
                                )}
                              </strong>
                            ),
                          },
                          {
                            value: job.company,
                            sep: ", ",
                            node: field(
                              `work.${i}.company`,
                              job.company,
                              (r, v) => (r.work[i].company = v),
                              "Company",
                            ),
                          },
                          {
                            value: job.location,
                            sep: " · ",
                            node: (
                              <span className="muted">
                                {field(
                                  `work.${i}.location`,
                                  job.location,
                                  (r, v) => (r.work[i].location = v),
                                  "Location",
                                )}
                              </span>
                            ),
                          },
                        ]}
                      />
                    </p>
                    <span className="date">
                      <Join
                        parts={[
                          {
                            value: job.start,
                            node: field(
                              `work.${i}.start`,
                              job.start,
                              (r, v) => (r.work[i].start = v),
                              "Start",
                            ),
                          },
                          {
                            value: job.end,
                            sep: " – ",
                            node: field(
                              `work.${i}.end`,
                              job.end,
                              (r, v) => (r.work[i].end = v),
                              "End",
                            ),
                          },
                        ]}
                      />
                    </span>
                  </div>
                  {bullets("work", i, job.highlights)}
                </article>
              );
            })}
          </Section>
        )}

        {projects.length > 0 && (
          <Section
            title="Projects"
            addLabel="Add project"
            onAdd={() =>
              add("project", `projects.${projects.length}.name`, (r) =>
                r.projects.push(blank.project()),
              )
            }
          >
            {projects.map((p, i) => {
              const original = master && originalProject(master, p);
              const changed = isReworded(original, p);
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id
                <article key={i} data-changed={changed || undefined}>
                  {itemTools("projects", i, {
                    onAdd: addBullet("projects", i),
                    addLabel: "Add a bullet",
                    onExtra: showLine(`projects.${i}.stack`, p.stack)
                      ? undefined
                      : () => askFor(`projects.${i}.stack`),
                    extraLabel: "Add tools used",
                    onRestore:
                      changed && original
                        ? () =>
                            edit(
                              stamp("restore"),
                              (r) =>
                                (r.projects[i].highlights = [
                                  ...original.highlights,
                                ]),
                            )
                        : undefined,
                  })}
                  <div className="row">
                    <p>
                      <Join
                        parts={[
                          {
                            value: p.name,
                            node: (
                              <strong>
                                {field(
                                  `projects.${i}.name`,
                                  p.name,
                                  (r, v) => (r.projects[i].name = v),
                                  "Project name",
                                )}
                              </strong>
                            ),
                          },
                          {
                            value: p.url,
                            sep: " · ",
                            node: (
                              <span className="muted">
                                {field(
                                  `projects.${i}.url`,
                                  p.url,
                                  (r, v) => (r.projects[i].url = v),
                                  "Link",
                                )}
                              </span>
                            ),
                          },
                        ]}
                      />
                    </p>
                    <span className="date">
                      {field(
                        `projects.${i}.year`,
                        p.year,
                        (r, v) => (r.projects[i].year = v),
                        "Year",
                      )}
                    </span>
                  </div>
                  {showLine(`projects.${i}.stack`, p.stack) && (
                    <p className={cn("stack", !p.stack && "rs-np")}>
                      {field(
                        `projects.${i}.stack`,
                        p.stack,
                        (r, v) => (r.projects[i].stack = v),
                        "Tools used, e.g. Rust, Postgres",
                      )}
                    </p>
                  )}
                  {bullets("projects", i, p.highlights)}
                  {mode === "flow" && (
                    <p className="rs-meta rs-np">
                      <span>
                        Priority{" "}
                        {field(
                          `projects.${i}.tier`,
                          p.tier,
                          (r, v) => (r.projects[i].tier = v),
                          "T1, T2 or T3",
                        )}
                      </span>
                      <span>
                        Status{" "}
                        {field(
                          `projects.${i}.status`,
                          p.status,
                          (r, v) => (r.projects[i].status = v),
                          "Complete or WIP",
                        )}
                      </span>
                      <span>
                        Best for{" "}
                        {field(
                          `projects.${i}.roleFit`,
                          p.roleFit,
                          (r, v) => (r.projects[i].roleFit = v),
                          "e.g. Backend, AI/ML",
                        )}
                      </span>
                    </p>
                  )}
                </article>
              );
            })}
          </Section>
        )}

        {skills.length > 0 && (
          <Section
            title="Skills"
            addLabel="Add group"
            onAdd={() =>
              add("skill", `skills.${skills.length}.group`, (r) =>
                r.skills.push(blank.skill()),
              )
            }
          >
            <dl className="skills">
              {skills.map((s, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id
                <div key={i} className="skill-row">
                  <dt>
                    {field(
                      `skills.${i}.group`,
                      s.group,
                      (r, v) => (r.skills[i].group = v),
                      "Group, e.g. Languages",
                    )}
                  </dt>
                  <dd>
                    {field(
                      `skills.${i}.items`,
                      s.items,
                      (r, v) => (r.skills[i].items = v),
                      "Skills, separated by commas",
                    )}
                    {itemTools("skills", i)}
                  </dd>
                </div>
              ))}
            </dl>
          </Section>
        )}

        {leadership.length > 0 && (
          <Section
            title="Leadership"
            addLabel="Add role"
            onAdd={() =>
              add("lead", `leadership.${leadership.length}.role`, (r) =>
                r.leadership.push(blank.leadership()),
              )
            }
          >
            {leadership.map((l, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id
              <div key={i} className="lead rs-item">
                {itemTools("leadership", i)}
                <Join
                  parts={[
                    {
                      value: l.role,
                      node: (
                        <strong>
                          {field(
                            `leadership.${i}.role`,
                            l.role,
                            (r, v) => (r.leadership[i].role = v),
                            "Role",
                          )}
                        </strong>
                      ),
                    },
                    {
                      value: l.org,
                      sep: ", ",
                      node: field(
                        `leadership.${i}.org`,
                        l.org,
                        (r, v) => (r.leadership[i].org = v),
                        "Organization",
                      ),
                    },
                    {
                      value: l.dates,
                      sep: " · ",
                      node: (
                        <span className="muted">
                          {field(
                            `leadership.${i}.dates`,
                            l.dates,
                            (r, v) => (r.leadership[i].dates = v),
                            "Dates",
                          )}
                        </span>
                      ),
                    },
                    {
                      value: l.details,
                      sep: ". ",
                      node: field(
                        `leadership.${i}.details`,
                        l.details,
                        (r, v) => (r.leadership[i].details = v),
                        "What you did",
                      ),
                    },
                  ]}
                />
              </div>
            ))}
          </Section>
        )}

        {education.length > 0 && (
          <Section
            title="Education"
            addLabel="Add school"
            onAdd={() =>
              add("school", `education.${education.length}.school`, (r) =>
                r.education.push(blank.education()),
              )
            }
          >
            {education.map((e, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id
              <article key={i}>
                {itemTools("education", i)}
                <div className="row">
                  <p>
                    <strong>
                      {field(
                        `education.${i}.school`,
                        e.school,
                        (r, v) => (r.education[i].school = v),
                        "School",
                      )}
                    </strong>
                  </p>
                  <span className="date">
                    {field(
                      `education.${i}.end`,
                      e.end,
                      (r, v) => (r.education[i].end = v),
                      "Year",
                    )}
                  </span>
                </div>
                <p>
                  <Join
                    parts={[
                      {
                        value: e.degree,
                        node: field(
                          `education.${i}.degree`,
                          e.degree,
                          (r, v) => (r.education[i].degree = v),
                          "Degree",
                        ),
                      },
                      {
                        value: e.details,
                        sep: " · ",
                        node: field(
                          `education.${i}.details`,
                          e.details,
                          (r, v) => (r.education[i].details = v),
                          "GPA, honors",
                        ),
                      },
                    ]}
                  />
                </p>
              </article>
            ))}
          </Section>
        )}

        {missing.length > 0 && (
          <div className="rs-sections rs-np">
            <span>Add a section:</span>
            {missing.map((name) => (
              <button key={name} type="button" onClick={() => addSection(name)}>
                <Plus /> {name}
              </button>
            ))}
          </div>
        )}
      </div>
    </Frame>
  );
}

/**
 * The paper. Keeps its real size and is scaled to fit the column; measures how
 * much room is left on a US Letter page as if it were printed.
 */
function Frame({
  mode,
  paper: size,
  resume,
  onFit,
  children,
}: {
  mode: "page" | "flow";
  paper: Paper;
  resume: Resume;
  onFit?: (spareLines: number) => void;
  children: ReactNode;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ scale: 1, width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = wrap.current;
    const paper = sheet.current;
    // The nearest ancestor that has a real box (wrappers like <astro-island> have none).
    let host = el?.parentElement ?? null;
    while (host && getComputedStyle(host).display === "contents") {
      host = host.parentElement;
    }
    if (!(el && paper && host)) {
      return;
    }
    // The frame hugs the paper (no empty white bands), centred in the space it has.
    const fit = () => {
      const scale = Math.min(
        Math.max(host.clientWidth / paper.offsetWidth, 0.3),
        1.15,
      );
      setView({
        scale,
        width: paper.offsetWidth * scale,
        height: paper.offsetHeight * scale,
      });
    };
    const observer = new ResizeObserver(fit);
    observer.observe(host);
    observer.observe(paper);
    fit();
    return () => observer.disconnect();
  }, []);

  // Measure after every edit, with the editing aids hidden, as the printed page would be.
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure whenever the resume changes
  useLayoutEffect(() => {
    const paper = sheet.current;
    const content = paper?.querySelector<HTMLElement>("#resume-content");
    if (!(paper && content && onFit)) {
      return;
    }
    paper.classList.add("rs-measure");
    const style = getComputedStyle(paper);
    const room =
      paper.clientHeight -
      Number.parseFloat(style.paddingTop) -
      Number.parseFloat(style.paddingBottom);
    const used = content.offsetHeight;
    const line = Number.parseFloat(style.lineHeight) || 16;
    paper.classList.remove("rs-measure");
    onFit(Math.floor((room - used) / line));
  }, [resume, onFit]);

  return (
    <div
      ref={wrap}
      className="sheet-wrap"
      style={{
        width: view.width || undefined,
        height: view.height || undefined,
      }}
    >
      {/* A printed page-mode sheet always gets its own paper size. */}
      {mode === "page" && (
        <style>{`@page { size: ${size === "a4" ? "A4" : "letter"} }`}</style>
      )}
      <div
        ref={sheet}
        id="resume-sheet"
        data-mode={mode}
        data-paper={size}
        className="resume-sheet"
        style={{ transform: `scale(${view.scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
