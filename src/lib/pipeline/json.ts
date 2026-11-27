import type { z } from "zod";

/**
 * The one thing every AI provider can do is return text. These helpers turn
 * that text into checked data, however the model chose to wrap it: in code
 * fences, after a sentence of chatter, with trailing commas, smart quotes or
 * raw line breaks inside strings.
 */

/** One call to a model: instructions in, text out. Every provider can do this. */
export type Ask = (request: {
  system: string;
  prompt: string;
  /** Earlier turns, used to show the model its own mistake. */
  history?: { role: "assistant" | "user"; content: string }[];
}) => Promise<string>;

export class PipelineError extends Error {
  constructor(
    public label: string,
    public problems: string[],
  ) {
    super(`${label}: ${problems.join("; ") || "no usable answer"}`);
  }
}

/** The first complete {...} or [...] in the text, ignoring brackets inside strings. */
const firstBlock = (text: string) => {
  const start = text.search(/[{[]/);
  if (start < 0) {
    return;
  }
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inString = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") {
        i++;
      } else if (c === '"') {
        inString = false;
      }
    } else if (c === '"') {
      inString = true;
    } else if (c === open) {
      depth++;
    } else if (c === close && --depth === 0) {
      return text.slice(start, i + 1);
    }
  }
  // Cut off mid-answer: hand back what there is and let repair close it.
  return text.slice(start);
};

/** Fixes the slips weaker models make most: smart quotes, raw newlines in strings, trailing commas, missing closers. */
const repairJson = (raw: string) => {
  const text = raw.replace(/[“”]/g, '"').replace(/’/g, "'");
  let out = "";
  let inString = false;
  const stack: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") {
        out += c + (text[i + 1] ?? "");
        i++;
      } else if (c === '"') {
        inString = false;
        out += c;
      } else if (c === "\n") {
        out += "\\n";
      } else if (c === "\r") {
        // dropped
      } else if (c === "\t") {
        out += "\\t";
      } else {
        out += c;
      }
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
    } else if (c === "{" || c === "[") {
      stack.push(c === "{" ? "}" : "]");
      out += c;
    } else if (c === "}" || c === "]") {
      out = out.replace(/,\s*$/, "");
      stack.pop();
      out += c;
    } else {
      out += c;
    }
  }
  if (inString) {
    out += '"';
  }
  out = out.replace(/,\s*$/, "");
  while (stack.length > 0) {
    out += stack.pop();
  }
  return out;
};

/** Parse whatever JSON is in a model's reply, or undefined when there is none. */
export const extractJson = (reply: string): unknown => {
  const text = reply.replace(/^﻿/, "").trim();
  const candidates = [
    text,
    text.replace(/^```[a-z]*\s*|\s*```$/gi, ""),
    firstBlock(text),
  ];
  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    for (const attempt of [candidate, repairJson(candidate)]) {
      try {
        return JSON.parse(attempt);
      } catch {
        // try the next form
      }
    }
  }
};

const describe = (error: z.ZodError) =>
  error.issues
    .slice(0, 6)
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`);

/**
 * Ask until the answer is valid, showing the model what was wrong each time.
 * `check` adds rules a schema cannot express (word counts, banned phrases).
 */
export async function askJson<S extends z.ZodType>(
  ask: Ask,
  options: {
    label: string;
    schema: S;
    system: string;
    prompt: string;
    /** A short example of the JSON to return; weaker models follow examples better than schemas. */
    example: string;
    attempts?: number;
    check?: (value: z.infer<S>) => string[];
  },
): Promise<z.infer<S>> {
  const attempts = options.attempts ?? 3;
  const system = `${options.system}\n\nReply with ONE JSON object and nothing else: no markdown, no explanation. Shape:\n${options.example}`;
  const history: { role: "assistant" | "user"; content: string }[] = [];
  let problems: string[] = [];

  for (let attempt = 1; attempt <= attempts; attempt++) {
    let reply: string;
    try {
      reply = await ask({
        system,
        prompt: options.prompt,
        history: history.length > 0 ? history : undefined,
      });
    } catch (error) {
      problems = [
        error instanceof Error ? error.message : "the model did not answer",
      ];
      if (attempt === attempts) {
        break;
      }
      continue;
    }

    const json = extractJson(reply);
    if (json === undefined) {
      problems = ["the reply contained no JSON"];
    } else {
      const parsed = options.schema.safeParse(json);
      if (parsed.success) {
        problems = options.check?.(parsed.data) ?? [];
        if (problems.length === 0) {
          return parsed.data;
        }
      } else {
        problems = describe(parsed.error);
      }
    }
    history.push(
      { role: "assistant", content: reply.slice(0, 4000) },
      {
        role: "user",
        content: `That reply was not accepted:\n- ${problems.join("\n- ")}\nReply again with the complete corrected JSON only.`,
      },
    );
  }
  console.warn(
    `[ai] ${options.label} gave up after ${attempts} tries: ${problems.join("; ").slice(0, 240)}`,
  );
  throw new PipelineError(options.label, problems);
}
