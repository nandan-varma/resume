/**
 * Where a piece of contact text should lead when someone clicks it in the PDF:
 * an email, a phone number or a web address. Anything else is plain text.
 */
export const hrefFor = (value: string): string | undefined => {
  const text = value.trim();
  if (!text || /\s/.test(text)) {
    return;
  }
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text)) {
    return `mailto:${text}`;
  }
  if (/^\+?[\d().-]{7,}$/.test(text)) {
    return `tel:${text.replace(/[^\d+]/g, "")}`;
  }
  if (/^https?:\/\//i.test(text)) {
    return text;
  }
  // "github.com/you", "you.dev", "www.site.com/page"
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(text)) {
    return `https://${text}`;
  }
};

const COLORS = [
  "blue",
  "green",
  "purple",
  "orange",
  "pink",
  "brown",
  "yellow",
  "red",
] as const;

/** A steady colour and initial for a company, so lists are easy to scan. */
export const avatarFor = (name: string) => {
  const clean = name.trim();
  let hash = 0;
  for (const ch of clean.toLowerCase()) {
    hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) >>> 0;
  }
  const initial = [...clean].find((c) => /\p{L}|\p{N}/u.test(c)) ?? "?";
  return {
    initial: initial.toUpperCase(),
    color: COLORS[hash % COLORS.length],
  };
};
