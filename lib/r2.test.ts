import { beforeAll, describe, expect, it, vi } from "vitest";

// lib/r2.ts constructs its S3Client at module scope and throws immediately
// if these are missing — stub them before the module is ever imported so
// the pure sanitizeFileName helper can be tested without real R2 credentials.
vi.stubEnv("R2_ACCESS_KEY_ID", "test-key");
vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret");
vi.stubEnv("R2_ENDPOINT", "https://example.com");

let sanitizeFileName: (name: string) => string;

beforeAll(async () => {
  ({ sanitizeFileName } = await import("./r2"));
});

describe("sanitizeFileName", () => {
  it("passes through a plain safe filename", () => {
    expect(sanitizeFileName("resume.pdf")).toBe("resume.pdf");
  });

  it("replaces disallowed characters with underscores", () => {
    expect(sanitizeFileName("my résumé (final)!.pdf")).toBe(
      "my_r_sum_final_.pdf"
    );
  });

  it("collapses runs of underscores into one", () => {
    expect(sanitizeFileName("a   b***c.pdf")).toBe("a_b_c.pdf");
  });

  it("preserves dots, hyphens, and underscores", () => {
    expect(sanitizeFileName("v1.2-final_draft.pdf")).toBe(
      "v1.2-final_draft.pdf"
    );
  });

  it("truncates to 100 characters", () => {
    const long = `${"a".repeat(150)}.pdf`;
    const result = sanitizeFileName(long);
    expect(result).toHaveLength(100);
    expect(result).toBe("a".repeat(100));
  });

  it("replaces path separators, leaving no way to escape the resumes/ prefix", () => {
    // Dots are allowed (real filenames use them), but slashes always become
    // underscores — the caller always prefixes with a fresh UUID and a fixed
    // "resumes/" key, so this alone isn't the traversal defense, just a check
    // that no raw "/" survives into the R2 object key.
    expect(sanitizeFileName("../../etc/passwd")).toBe(".._.._etc_passwd");
    expect(sanitizeFileName("../../etc/passwd")).not.toContain("/");
  });
});
