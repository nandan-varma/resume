import { describe, expect, it } from "vitest";
import { z } from "zod";
import { checkRateLimit, parseJsonBody } from "./api-guards";

describe("checkRateLimit", () => {
  it("returns null (allowed) while under the limit", () => {
    expect(checkRateLimit("guard-k1", 2, 60_000)).toBeNull();
  });

  it("returns a 429 Response once the limit is exceeded", async () => {
    const key = "guard-k2";
    expect(checkRateLimit(key, 1, 60_000)).toBeNull();

    const blocked = checkRateLimit(key, 1, 60_000);
    expect(blocked).not.toBeNull();
    expect(blocked?.status).toBe(429);
    const body = await blocked?.json();
    expect(body).toEqual({ error: "Too many requests. Please wait a minute." });
  });
});

describe("parseJsonBody", () => {
  const schema = z.object({ name: z.string().min(1) });

  it("returns ok:false with a 400 for invalid JSON", async () => {
    const req = new Request("http://x", { method: "POST", body: "not json" });
    const result = await parseJsonBody(req, schema);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error).toBe("Invalid request body");
    }
  });

  it("returns ok:false with a 400 and joined issues when the schema fails", async () => {
    const req = new Request("http://x", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
    });
    const result = await parseJsonBody(req, schema);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(400);
      const body = await result.response.json();
      expect(body.error).toContain("Invalid request:");
    }
  });

  it("returns ok:true with the parsed data on success", async () => {
    const req = new Request("http://x", {
      method: "POST",
      body: JSON.stringify({ name: "Alex" }),
    });
    const result = await parseJsonBody(req, schema);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ name: "Alex" });
    }
  });
});
