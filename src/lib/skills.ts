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
  ["Agile", "Scrum"],
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
export type SkillMatch = ReturnType<typeof matchSkills>;
