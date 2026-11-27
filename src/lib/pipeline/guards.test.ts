import { describe, expect, it } from "vitest";
import {
  guardBullets,
  inventions,
  letterProblems,
  normalizeLetter,
  overlap,
  polish,
  summaryProblems,
} from "./guards";

const profile =
  "Built a billing service in Go and PostgreSQL that processed 1.2M invoices per month. Cut p95 latency from 480 ms to 140 ms with Redis. Led 4 hackathons. 2025";

describe("polish", () => {
  it("enforces house style on any model's text", () => {
    expect(polish("**Built** an API — fast and reliable 🚀")).toBe(
      "Built an API - fast and reliable",
    );
    expect(polish("- leveraged Redis to utilize caching")).toBe(
      "Used Redis to use caching",
    );
    expect(polish("I built a thing")).toBe("Built a thing");
    expect(polish("  spaced   out \n text ")).toBe("Spaced out text");
  });
});

describe("inventions", () => {
  it("finds numbers and tools the profile never mentions", () => {
    expect(inventions("Cut latency by 90% using Kafka", profile)).toEqual([
      "the number 90",
      "the tool Kafka",
    ]);
    expect(
      inventions("Processed 1.2M invoices with Go and Redis in 2025", profile),
    ).toEqual([]);
  });
});

describe("guardBullets", () => {
  const rules = {
    original: [
      "Built a billing service in Go and PostgreSQL that processed 1.2M invoices per month.",
      "Cut p95 latency from 480 ms to 140 ms with Redis.",
    ],
    profileText: profile,
    maxChars: 190,
    maxCount: 4,
  };

  it("keeps safe rewrites", () => {
    const r = guardBullets(
      [
        "Built a billing service in Go and PostgreSQL, processing 1.2M invoices per month.",
        "Reduced p95 latency from 480 ms to 140 ms using Redis.",
      ],
      rules,
    );
    expect(r.bullets).toHaveLength(2);
    expect(r.rejected).toHaveLength(0);
    expect(r.usedModel).toBe(true);
  });

  it("rejects invented numbers and tools, and falls back to the person's own words", () => {
    const r = guardBullets(
      [
        "Built a billing service handling 9M invoices per month.",
        "Cut latency 70% with Kafka and Rust.",
      ],
      rules,
    );
    expect(r.usedModel).toBe(false);
    expect(r.bullets).toEqual(rules.original);
    expect(r.rejected).toHaveLength(2);
  });

  it("tops up when the model drops a bullet, and survives garbage", () => {
    const r = guardBullets(
      ["Reduced p95 latency from 480 ms to 140 ms using Redis."],
      rules,
    );
    expect(r.bullets).toHaveLength(2);
    expect(r.bullets[1]).toBe(rules.original[0]);
    expect(guardBullets("not a list", rules).bullets).toEqual(rules.original);
    expect(guardBullets([42, null, ""], rules).bullets).toEqual(rules.original);
  });

  it("respects length and first-person rules and removes duplicates", () => {
    const long = `Built ${"a very long thing ".repeat(20)}`;
    const r = guardBullets(
      [
        long,
        "We built a thing together here",
        "Reduced p95 latency from 480 ms to 140 ms using Redis.",
        "Reduced p95 latency from 480 ms to 140 ms using Redis!",
      ],
      rules,
    );
    expect(r.bullets[0]).toBe(
      "Reduced p95 latency from 480 ms to 140 ms using Redis.",
    );
    expect(r.bullets.filter((b) => b.startsWith("Reduced"))).toHaveLength(1);
  });
});

describe("summary and letter checks", () => {
  it("flags first person, placeholders and inventions in a summary", () => {
    expect(
      summaryProblems(
        "I am a backend engineer who loves building scalable systems for customers.",
        profile,
      ),
    ).toHaveLength(1);
    expect(
      summaryProblems(
        "Backend engineer with 10 years of Kafka experience building scalable billing systems.",
        profile,
      ),
    ).toHaveLength(2);
    expect(
      summaryProblems(
        "Backend engineer who builds billing services in Go and PostgreSQL at scale.",
        profile,
      ),
    ).toEqual([]);
  });

  const good = `Dear Hiring Team,\n\n${"Acme builds payments software and that is exactly where my billing work in Go fits. ".repeat(5)}\n\n${"At my last role I led a billing service that processed 1.2M invoices per month. ".repeat(4)}\n\nI would welcome a conversation about the role.\n\nBest regards,\nAda Lovelace`;

  it("rebuilds any letter into house shape with the real name", () => {
    const fixed = normalizeLetter(
      "Hello,\n\nDear [Hiring Manager],\n\nBody paragraph one.\n\nBody two.\n\nSincerely,\nAda",
      "Ada Lovelace",
    );
    expect(fixed.startsWith("Dear Hiring Team,\n\n")).toBe(true);
    expect(fixed.endsWith("Best regards,\nAda Lovelace")).toBe(true);
    expect(normalizeLetter("", "Ada")).toBe("");
  });

  it("validates a letter", () => {
    const ctx = { company: "Acme", title: "Engineer", profileText: profile };
    expect(letterProblems(normalizeLetter(good, "Ada Lovelace"), ctx)).toEqual(
      [],
    );
    expect(
      letterProblems(
        "Dear Hiring Team,\n\nToo short.\n\nBest regards,\nAda",
        ctx,
      )[0],
    ).toContain("too short");
    expect(
      letterProblems(
        normalizeLetter(good.replace(/Acme/g, "[Company]"), "Ada Lovelace"),
        ctx,
      ).join(" "),
    ).toContain("placeholder");
    expect(
      letterProblems(
        normalizeLetter(
          good.replace(
            "I would welcome a conversation about the role.",
            "At scale I cut costs 55% with Kafka.",
          ),
          "Ada Lovelace",
        ),
        ctx,
      ).join(" "),
    ).toContain("not in the profile");
  });
});

describe("letters may cite the company's own facts, but not as the person's", () => {
  const ctx = {
    company: "Acme",
    title: "Engineer",
    profileText: profile,
    postingText: "Acme serves 70000 merchants using Kafka.",
  };
  const letter = (middle: string) =>
    normalizeLetter(
      `${"Acme builds payments software and that is where my billing work in Go fits. ".repeat(6)}\n\n${middle} ${"I care about reliable systems and clear APIs. ".repeat(8)}\n\n${"I would welcome a conversation about the role. ".repeat(4)}`,
      "Ada Lovelace",
    );

  it("allows a number from the posting in a sentence about the company", () => {
    expect(
      letterProblems(
        letter(
          "Acme serves 70000 merchants, which is the scale I want to work at.",
        ),
        ctx,
      ),
    ).toEqual([]);
  });

  it("rejects the same number as the person's own result", () => {
    expect(
      letterProblems(
        letter("I served 70000 merchants at my last job."),
        ctx,
      ).join(" "),
    ).toContain("about you");
  });
});

describe("overlap", () => {
  it("measures shared words", () => {
    expect(overlap("built a billing service", "built a billing service")).toBe(
      1,
    );
    expect(overlap("alpha beta gamma", "delta epsilon zeta")).toBe(0);
  });
});

describe("polish keeps sentences apart", () => {
  it("turns line breaks into spaces and curly quotes into plain ones", () => {
    expect(polish("Led the team.\nShipped the feature.")).toBe(
      "Led the team. Shipped the feature.",
    );
    expect(polish("It’s “done”")).toBe('It\'s "done"');
  });
});
