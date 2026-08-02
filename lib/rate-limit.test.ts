import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    expect(rateLimit("k1", 3, 1000)).toBe(true);
    expect(rateLimit("k1", 3, 1000)).toBe(true);
    expect(rateLimit("k1", 3, 1000)).toBe(true);
  });

  it("blocks once the limit is reached within the window", () => {
    expect(rateLimit("k2", 2, 1000)).toBe(true);
    expect(rateLimit("k2", 2, 1000)).toBe(true);
    expect(rateLimit("k2", 2, 1000)).toBe(false);
  });

  it("allows again once old hits fall outside the window", () => {
    expect(rateLimit("k3", 1, 1000)).toBe(true);
    expect(rateLimit("k3", 1, 1000)).toBe(false);

    vi.setSystemTime(1001);
    expect(rateLimit("k3", 1, 1000)).toBe(true);
  });

  it("tracks separate keys independently", () => {
    expect(rateLimit("k4a", 1, 1000)).toBe(true);
    expect(rateLimit("k4a", 1, 1000)).toBe(false);
    // A different key has its own budget, unaffected by k4a.
    expect(rateLimit("k4b", 1, 1000)).toBe(true);
  });

  it("only expires hits older than the window, not all of them", () => {
    expect(rateLimit("k5", 2, 1000)).toBe(true); // t=0
    vi.setSystemTime(600);
    expect(rateLimit("k5", 2, 1000)).toBe(true); // t=600, both within window
    vi.setSystemTime(1001);
    // t=0 hit has now expired (1001 - 0 >= 1000), t=600 hit hasn't.
    expect(rateLimit("k5", 2, 1000)).toBe(true);
    expect(rateLimit("k5", 2, 1000)).toBe(false);
  });
});
