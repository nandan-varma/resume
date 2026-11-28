import { afterEach, describe, expect, it, vi } from "vitest";
import { getJob, searchJobs, TalloError } from "./tallo";

const answer = (status: number, body: unknown = {}) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(body, { status })),
  );
const error = (code: string, message: string) => ({
  error: { code, message, hint: "" },
});
const query = { title: ["engineer"], company: [], location: [], country: [] };

afterEach(() => vi.unstubAllGlobals());

describe("getJob", () => {
  it("returns the posting", async () => {
    answer(200, { id: "7", title: "Engineer", description: "All of it." });
    await expect(getJob("7")).resolves.toMatchObject({ id: "7" });
  });

  it("says null only when the posting is closed or unknown", async () => {
    answer(410, error("closed", "closed"));
    await expect(getJob("7")).resolves.toBeNull();
    answer(404, error("unknown", "unknown"));
    await expect(getJob("7")).resolves.toBeNull();
  });

  it("does not call a busy or failing Tallo 'no longer listed'", async () => {
    answer(429, error("rate_limited", "slow down"));
    await expect(getJob("7")).rejects.toMatchObject({ kind: "busy" });
    answer(503, error("busy", "Database busy"));
    await expect(getJob("7")).rejects.toBeInstanceOf(TalloError);
    await expect(getJob("7")).rejects.toMatchObject({ kind: "unavailable" });
  });
});

describe("searchJobs", () => {
  it("shows the person Tallo's own words for a rejected search", async () => {
    answer(
      400,
      error("invalid_parameter", "title: must be 2 to 80 characters"),
    );
    await expect(searchJobs(query)).rejects.toThrow(
      "title: must be 2 to 80 characters",
    );
  });

  it("turns rate limits and outages into plain messages", async () => {
    answer(429, error("rate_limited", "x"));
    await expect(searchJobs(query)).rejects.toMatchObject({ kind: "busy" });
    answer(500, {});
    await expect(searchJobs(query)).rejects.toMatchObject({
      kind: "unavailable",
    });
  });
});
