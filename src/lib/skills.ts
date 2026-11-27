import type { Resume } from "./resume";

/** Common tools and languages, each with the other names people use for it. */
const VOCAB: string[][] = [
  ["JavaScript", "JS"],
  ["TypeScript", "TS"],
  ["Python"],
  ["Java"],
  ["Kotlin"],
  ["Swift"],
  ["Rust"],
  ["Golang"],
  ["C++", "cpp"],
  ["C#", "csharp"],
  [".NET", "dotnet"],
  ["Ruby"],
  ["Rails", "Ruby on Rails"],
  ["PHP"],
  ["Laravel"],
  ["Scala"],
  ["Elixir"],
  ["SQL"],
  ["PostgreSQL", "Postgres"],
  ["MySQL"],
  ["MongoDB"],
  ["Redis"],
  ["SQLite"],
  ["DynamoDB"],
  ["Elasticsearch"],
  ["Kafka"],
  ["GraphQL"],
  ["REST", "RESTful"],
  ["gRPC"],
  ["React"],
  ["Next.js", "Nextjs"],
  ["Vue", "Vue.js"],
  ["Angular"],
  ["Svelte"],
  ["Astro"],
  ["Tailwind"],
  ["HTML"],
  ["CSS"],
  ["Node.js", "Node", "NodeJS"],
  ["Express"],
  ["Django"],
  ["Flask"],
  ["FastAPI"],
  ["Spring", "Spring Boot"],
  ["React Native"],
  ["Flutter"],
  ["iOS"],
  ["Android"],
  ["SwiftUI"],
  ["AWS", "Amazon Web Services"],
  ["Azure"],
  ["GCP", "Google Cloud"],
  ["Cloudflare"],
  ["Docker"],
  ["Kubernetes", "K8s"],
  ["Terraform"],
  ["Ansible"],
  ["Linux"],
  ["CI/CD", "CI", "continuous integration"],
  ["GitHub Actions"],
  ["Jenkins"],
  ["Git"],
  ["Prometheus"],
  ["Grafana"],
  ["Datadog"],
  ["Machine Learning", "ML"],
  ["Deep Learning"],
  ["PyTorch"],
  ["TensorFlow"],
  ["LLM", "LLMs", "large language models"],
  ["NLP"],
  ["Pandas"],
  ["NumPy"],
  ["Spark"],
  ["Airflow"],
  ["dbt"],
  ["Snowflake"],
  ["BigQuery"],
  ["Microservices"],
  ["Distributed Systems"],
  ["Agile"],
  ["Scrum"],
  ["Figma"],
  ["Jest"],
  ["Cypress"],
  ["Playwright"],
  ["Selenium"],
  ["WebSockets"],
  ["OAuth"],
  ["Security"],
  ["Embedded"],
  ["Assembly"],
  ["WebAssembly", "WASM"],
];

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/** How many times a name appears in the text as a whole word, so "Java" is not found in "JavaScript". */
const count = (text: string, name: string) =>
  text.match(new RegExp(`(?<![\\w+#.])${escapeRegex(name)}(?![\\w+#])`, "gi"))
    ?.length ?? 0;

const mentions = (text: string, names: string[]) =>
  names.reduce((sum, n) => sum + count(text, n), 0);

const resumeText = (r: Resume) =>
  [
    r.basics.summary,
    ...r.summaries,
    ...r.skills.map((s) => s.items),
    ...r.work.flatMap((w) => [w.position, ...w.highlights]),
    ...r.projects.flatMap((p) => [p.stack, p.roleFit, ...p.highlights]),
  ].join("\n");

/**
 * Which well-known tools a posting names that the profile already covers, and
 * which it does not. A quick, honest signal; the tailoring step does the real matching.
 */
export const matchSkills = (resume: Resume, posting: string) => {
  const mine = resumeText(resume);
  const have: string[] = [];
  const missing: string[] = [];
  const asked = VOCAB.map((names) => ({
    name: names[0],
    asked: mentions(posting, names),
    covered: mentions(mine, names) > 0,
  }))
    .filter((t) => t.asked > 0)
    .sort((a, b) => b.asked - a.asked);
  for (const t of asked) {
    (t.covered ? have : missing).push(t.name);
  }
  const total = have.length + missing.length;
  return {
    have: have.slice(0, 10),
    missing: missing.slice(0, 6),
    total,
    covered: have.length,
  };
};

/** The well-known tools a text mentions, by their main name. */
export const toolsIn = (text: string) =>
  VOCAB.filter((names) => mentions(text, names) > 0).map((names) => names[0]);

/**
 * Spell skills the way the posting does. If the profile says "Postgres" and the
 * posting asks for "PostgreSQL", an ATS matching keywords literally will miss
 * it. Only tools the person already lists are renamed; nothing is added.
 */
export const alignSkillNames = (items: string, posting: string) => {
  let out = items;
  for (const names of VOCAB) {
    if (names.length < 2) {
      continue;
    }
    // The posting's preferred spelling is the one it uses most.
    const wanted = names
      .map((name) => ({ name, n: count(posting, name) }))
      .sort((a, b) => b.n - a.n)[0];
    if (wanted.n === 0) {
      continue;
    }
    for (const alias of names) {
      if (
        alias === wanted.name ||
        count(out, alias) === 0 ||
        count(out, wanted.name) > 0
      ) {
        continue;
      }
      out = out.replace(
        new RegExp(`(?<![\\w+#.])${escapeRegex(alias)}(?![\\w+#])`, "gi"),
        wanted.name,
      );
    }
  }
  return out;
};

/** Skill items from a comma-separated list, the ones the posting mentions first. */
export const sortSkillItems = (items: string, posting: string) => {
  const parts = items
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const score = (part: string) => (count(posting, part) > 0 ? 1 : 0);
  return parts
    .map((part, index) => ({ part, index }))
    .sort((a, b) => score(b.part) - score(a.part) || a.index - b.index)
    .map((p) => p.part)
    .join(", ");
};
