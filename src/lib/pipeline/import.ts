import { z } from "zod";
import { Resume } from "../resume";
import { cleanLine } from "../text";
import { overlap, polish } from "./guards";
import { type Ask, askJson } from "./json";
import { importPrompt } from "./prompts";

/** Words and numbers only, lower case: a forgiving way to ask "is this in the document?". */
const flat = (text: string) =>
  text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

const KNOWN_HOSTS =
  /^(?:https?:\/\/)?(?:www\.)?(?:github\.com|gitlab\.com|bitbucket\.org|linkedin\.com\/in|linkedin\.com\/company|kaggle\.com|medium\.com|dev\.to|x\.com|twitter\.com|scholar\.google\.com|leetcode\.com|stackoverflow\.com)\//i;
const MODERN_TLD =
  /\.(?:dev|io|me|fyi|app|xyz|tech|ai|codes|page|site|online|blog|pro)(?:\/|$)/i;

/** Contact facts read straight from the text, so a model can neither invent nor drop them. */
export const extractFacts = (text: string) => {
  const emails = [
    ...new Set(text.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? []),
  ];
  const phones = [
    ...new Set(
      (
        text.match(
          /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g,
        ) ?? []
      ).map((p) => p.trim()),
    ),
  ];
  const withoutEmails = text.replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, " ");
  const links = [
    ...new Set(
      (
        withoutEmails.match(
          /\b(?:https?:\/\/)?(?:www\.)?(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s,;|)>\]]*)?/gi,
        ) ?? []
      )
        .map((u) => u.replace(/[.,;:]+$/, ""))
        .filter(
          (u) =>
            KNOWN_HOSTS.test(u) ||
            /^https?:\/\//i.test(u) ||
            /^www\./i.test(u) ||
            MODERN_TLD.test(u),
        ),
    ),
  ];
  const firstLine = text
    .split("\n")
    .map((l) => cleanLine(l))
    .find((l) => l.length > 0);
  const name =
    firstLine &&
    firstLine.split(" ").length <= 6 &&
    !/[\d@:/]/.test(firstLine) &&
    firstLine.length <= 60
      ? firstLine
      : undefined;
  return { emails, phones, links, name };
};

const str = (v: unknown) =>
  typeof v === "string" ? v : typeof v === "number" ? String(v) : "";
const arr = (v: unknown) => (Array.isArray(v) ? v : []);
const obj = (v: unknown) =>
  typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
const strings = (v: unknown) =>
  (Array.isArray(v) ? v : typeof v === "string" ? v.split("\n") : [])
    .map(str)
    .map((s) => s.trim())
    .filter(Boolean);

/** Shape whatever the model returned into something the Resume schema accepts. */
const coerceResume = (raw: unknown) => {
  const r = obj(raw);
  const b = obj(r.basics);
  const rows = (v: unknown, fields: string[]) =>
    arr(v).map((item) => {
      const o = obj(item);
      return Object.fromEntries(fields.map((f) => [f, str(o[f])]));
    });
  return {
    basics: {
      name: str(b.name),
      headline: str(b.headline),
      email: str(b.email),
      phone: str(b.phone),
      location: str(b.location),
      summary: str(b.summary),
      links: arr(b.links).map((l) =>
        typeof l === "string"
          ? { label: "", url: l }
          : { label: str(obj(l).label), url: str(obj(l).url) },
      ),
    },
    work: arr(r.work).map((w) => ({
      ...rows([w], ["company", "position", "location", "start", "end"])[0],
      highlights: strings(obj(w).highlights),
    })),
    education: rows(r.education, ["school", "degree", "end", "details"]),
    projects: arr(r.projects).map((p) => ({
      ...rows([p], ["name", "url", "year", "stack"])[0],
      highlights: strings(obj(p).highlights),
    })),
    skills: arr(r.skills).map((s) => {
      const o = obj(s);
      return {
        group: str(o.group),
        items: Array.isArray(o.items)
          ? o.items.map(str).join(", ")
          : str(o.items),
      };
    }),
    leadership: rows(r.leadership, ["role", "org", "dates", "details"]),
  };
};

const ImportReply = z.preprocess(coerceResume, Resume);

/** Keep an item only if its key words actually appear in the document. */
const grounded = (source: string, ...keys: string[]) => {
  const hay = flat(source);
  const wanted = keys.map(flat).filter((k) => k.length >= 3);
  return wanted.length === 0 || wanted.some((k) => hay.includes(k));
};

const mostlyIn = (source: string, bullet: string) =>
  overlap(bullet, source) >= 0.7;

export type ImportResult = { resume: Resume; notes: string[] };

/**
 * Turn resume text into a profile, on any model. Contact details come from the
 * text itself; the model supplies structure, and anything it "finds" that is
 * not in the document is dropped before it can reach the profile.
 */
export async function importPipeline(
  ask: Ask,
  text: string,
): Promise<ImportResult> {
  const notes: string[] = [];
  const facts = extractFacts(text);
  // If the model cannot read it, the error reaches the person: a half-empty profile helps nobody.
  const parsed = await askJson(ask, {
    label: "import",
    schema: ImportReply,
    ...importPrompt(text),
    attempts: 3,
  });

  const base = parsed;
  const lower = text.toLowerCase();
  const mentioned = (value: string) =>
    value.trim() !== "" && lower.includes(value.trim().toLowerCase());

  const links = [
    ...base.basics.links.filter((l) => mentioned(l.url)),
    ...facts.links
      .filter(
        (url) => !base.basics.links.some((l) => flat(l.url) === flat(url)),
      )
      .filter((url) => KNOWN_HOSTS.test(url)),
  ].map((l) => (typeof l === "string" ? { label: "", url: l } : l));

  const resume: Resume = {
    ...base,
    basics: {
      ...base.basics,
      name: mentioned(base.basics.name)
        ? polish(base.basics.name)
        : (facts.name ?? ""),
      email: mentioned(base.basics.email)
        ? base.basics.email.trim()
        : (facts.emails[0] ?? ""),
      phone:
        mentioned(base.basics.phone) ||
        (/\d/.test(base.basics.phone) &&
          flat(text).includes(flat(base.basics.phone)))
          ? base.basics.phone.trim()
          : (facts.phones[0] ?? ""),
      links: links.slice(0, 6),
      summary:
        base.basics.summary && mostlyIn(text, base.basics.summary)
          ? base.basics.summary
          : "",
    },
    work: base.work
      .filter((w) => grounded(text, w.company, w.position))
      .map((w) => ({
        ...w,
        highlights: w.highlights.filter((h) => mostlyIn(text, h)),
      })),
    education: base.education.filter((e) => grounded(text, e.school, e.degree)),
    projects: base.projects
      .filter((p) => grounded(text, p.name))
      .map((p) => ({
        ...p,
        highlights: p.highlights.filter((h) => mostlyIn(text, h)),
      })),
    skills: base.skills.filter((s) =>
      grounded(text, s.items.split(",")[0] ?? "", s.group),
    ),
    leadership: base.leadership.filter((l) => grounded(text, l.role, l.org)),
  };

  const dropped =
    base.work.length -
    resume.work.length +
    (base.projects.length - resume.projects.length) +
    (base.education.length - resume.education.length);
  if (dropped > 0) {
    notes.push(
      `We left out ${dropped} ${dropped === 1 ? "entry" : "entries"} that did not appear in your document.`,
    );
  }
  return { resume, notes };
}
