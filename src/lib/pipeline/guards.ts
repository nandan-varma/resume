import { toolsIn } from "../skills";
import { stripUnsafe } from "../text";

/**
 * Checks that make a model's writing safe to use whichever model wrote it.
 * Each one answers "did it add a fact we cannot vouch for?" or "does it read
 * like a resume?". When the answer is no, the caller keeps the person's own
 * words instead.
 */

const numbersIn = (text: string) => {
  const found = new Set<string>();
  for (const m of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) {
    found.add(m[0].replace(/,/g, ""));
  }
  return found;
};

/** Numbers and well-known tools a text mentions that the source never does. */
export const inventions = (text: string, sourceText: string) => {
  const known = numbersIn(sourceText);
  const tools = new Set(toolsIn(sourceText));
  return [
    ...[...numbersIn(text)]
      .filter((n) => !known.has(n))
      .map((n) => `the number ${n}`),
    ...toolsIn(text)
      .filter((t) => !tools.has(t))
      .map((t) => `the tool ${t}`),
  ];
};

const SWAPS: [RegExp, string][] = [
  [/\bleverag(?:e|es)\b/gi, "use"],
  [/\bleveraged\b/gi, "used"],
  [/\bleveraging\b/gi, "using"],
  [/\butili[sz](?:e|es)\b/gi, "use"],
  [/\butili[sz]ed\b/gi, "used"],
  [/\butili[sz]ing\b/gi, "using"],
  [/\bvarious\s+/gi, ""],
];

/**
 * House style, enforced in code so it holds on any model: plain punctuation (a
 * single hyphen, never an em or en dash), no markdown, emoji or list markers,
 * and none of the filler words recruiters tire of.
 */
const clean = (text: string, prose: boolean) => {
  let out = stripUnsafe(text.replace(/[\r\n\t]+/g, " "))
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s*[—–]\s*/g, " - ")
    .replace(/[*_`]{1,3}([^*_`]+)[*_`]{1,3}/g, "$1")
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "")
    // A bullet starts with a verb ("I built" becomes "Built"); a letter keeps its "I".
    .replace(prose ? /^$/ : /^I\s+(?=[a-z])/, "")
    .replace(/\s+/g, " ")
    .trim();
  for (const [pattern, replacement] of SWAPS) {
    out = out.replace(pattern, replacement);
  }
  out = out.replace(/\s+/g, " ").trim();
  return out.charAt(0).toUpperCase() + out.slice(1);
};

/** Style for a bullet or a summary: starts with a verb, never "I". */
export const polish = (text: string) => clean(text, false);

/** Style for letter paragraphs: the same house rules, but first person stays. */
const polishProse = (text: string) => clean(text, true);

const words = (text: string) =>
  new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\p{N}+#.]+/u)
      .filter((w) => w.length >= 3),
  );

/** How much two texts share, from 0 to 1. */
export const overlap = (a: string, b: string) => {
  const x = words(a);
  const y = words(b);
  if (x.size === 0 || y.size === 0) {
    return 0;
  }
  let shared = 0;
  for (const w of x) {
    if (y.has(w)) {
      shared++;
    }
  }
  return shared / Math.min(x.size, y.size);
};

export type BulletRules = {
  original: string[];
  /** Everything the person has written, as one string: the only place facts may come from. */
  profileText: string;
  maxChars: number;
  maxCount: number;
};

/**
 * Keep the model's rewritten bullets that are safe, topping up with the
 * person's own originals so a weak model can never leave an item thin.
 */
export const guardBullets = (candidate: unknown, rules: BulletRules) => {
  const list = Array.isArray(candidate) ? candidate : [];
  const accepted: string[] = [];
  const rejected: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") {
      continue;
    }
    const bullet = polish(item);
    const why =
      bullet.length < 12
        ? "too short"
        : bullet.length > rules.maxChars
          ? "too long"
          : /^(?:i|we|my)\b/i.test(bullet)
            ? "first person"
            : inventions(bullet, rules.profileText)[0];
    if (why) {
      rejected.push(`${bullet.slice(0, 50)}: ${why}`);
    } else if (!accepted.some((a) => overlap(a, bullet) > 0.85)) {
      accepted.push(bullet);
    }
  }

  const wanted = Math.min(rules.original.length, rules.maxCount);
  const bullets = accepted.slice(0, rules.maxCount);
  for (const own of rules.original) {
    if (bullets.length >= wanted) {
      break;
    }
    if (!bullets.some((b) => overlap(b, own) > 0.6)) {
      bullets.push(own);
    }
  }
  return { bullets, rejected, usedModel: accepted.length > 0 };
};

const FIRST_PERSON = /\b(?:i|i'm|i've|my|me)\b/i;
const PLACEHOLDER =
  /\[[^\]]{2,40}\]|\{\{|<[a-z][^>]*>|lorem ipsum|\byour (?:name|company)\b/i;

/** Problems with a proposed summary, or none. */
export const summaryProblems = (summary: string, profileText: string) => {
  const problems: string[] = [];
  if (summary.length < 40) {
    problems.push("The summary is too short.");
  }
  if (summary.length > 360) {
    problems.push(
      "The summary is longer than three lines: keep it under 330 characters.",
    );
  }
  if (FIRST_PERSON.test(summary)) {
    problems.push('Write the summary without "I", "my" or "me".');
  }
  if (PLACEHOLDER.test(summary)) {
    problems.push("The summary contains a placeholder.");
  }
  for (const made of inventions(summary, profileText)) {
    problems.push(`The summary uses ${made}, which is not in the profile.`);
  }
  return problems;
};

const CLOSINGS =
  /^(?:best regards|kind regards|regards|sincerely|best|thanks|thank you|yours (?:sincerely|truly)|warm regards)[,.!]*$/i;

/** A letter in house shape: our greeting, clean paragraphs, our sign-off with the real name. */
export const normalizeLetter = (raw: string, name: string) => {
  const lines = stripUnsafe(raw, true)
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim());
  while (lines.length > 0 && (lines[0] === "" || /^dear\b/i.test(lines[0]))) {
    lines.shift();
  }
  while (lines.length > 0) {
    const last = lines[lines.length - 1];
    const first = name.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
    if (
      last === "" ||
      CLOSINGS.test(last) ||
      (first &&
        last.toLowerCase().includes(first) &&
        last.split(/\s+/).length <= 4)
    ) {
      lines.pop();
    } else {
      break;
    }
  }
  const paragraphs = lines
    .join("\n")
    .split(/\n\s*\n/)
    .map((p) => polishProse(p.replace(/\n/g, " ")))
    .filter(Boolean);
  if (paragraphs.length === 0) {
    return "";
  }
  return `Dear Hiring Team,\n\n${paragraphs.join("\n\n")}\n\nBest regards,\n${name.trim()}`.trim();
};

/** A sentence that says what the person did or has: "I built...", "I cut...", "my work at...". */
const CLAIM =
  /\b(?:i|i've|we)\s+(?:(?:also|then|have|had|recently|later)\s+)*(?:\w+ed|built|led|ran|wrote|cut|grew|made|taught|won|drove|saved|held|took|began|brought|kept)\b|\bmy\s+(?:work|role|time|team|experience|projects?|job)\b/i;

/**
 * Problems with a normalized cover letter, or none. Sentences about what the person did
 * ("I built...", "my work at...") may only use facts from the profile; sentences about the company
 * may also use numbers and tools from the posting.
 */
export const letterProblems = (
  letter: string,
  ctx: {
    company: string;
    title: string;
    profileText: string;
    postingText?: string;
  },
) => {
  const problems: string[] = [];
  const body = letter
    .replace(/^Dear Hiring Team,\s*/, "")
    .replace(/\s*Best regards,[\s\S]*$/, "");
  const count = body.split(/\s+/).filter(Boolean).length;
  if (count < 120) {
    problems.push(
      `The letter is too short (${count} words). Write about 250 words in three paragraphs.`,
    );
  }
  if (count > 420) {
    problems.push(
      `The letter is too long (${count} words). Keep it to about 250 words.`,
    );
  }
  if (PLACEHOLDER.test(letter)) {
    problems.push(
      "The letter contains a placeholder such as [Company]. Use the real names.",
    );
  }
  const company = ctx.company.trim().split(/\s+/)[0]?.toLowerCase();
  const named =
    company && company.length > 2 && body.toLowerCase().includes(company);
  if (!named && overlap(ctx.title, body) < 0.5) {
    problems.push(`The letter never mentions ${ctx.company} or the role.`);
  }
  if (
    /\bi am (?:writing to apply|excited to apply|thrilled to apply)\b/i.test(
      body,
    )
  ) {
    problems.push(
      'Do not open with "I am writing to apply". Open with something specific.',
    );
  }
  const aboutCompany = `${ctx.profileText} ${ctx.postingText ?? ""}`;
  const seen = new Set<string>();
  for (const sentence of body.split(/(?<=[.!?])\s+/)) {
    const aboutMe = CLAIM.test(sentence);
    for (const made of inventions(
      sentence,
      aboutMe ? ctx.profileText : aboutCompany,
    )) {
      if (!seen.has(made)) {
        seen.add(made);
        problems.push(
          `The letter uses ${made}${aboutMe ? " about you" : ""}, which is not in the profile${aboutMe ? "" : " or the posting"}.`,
        );
      }
    }
  }
  return problems;
};
