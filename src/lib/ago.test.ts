import { describe, expect, it } from "vitest";
import { ago } from "./ago";

describe("ago", () => {
  const now = Date.parse("2026-11-27T12:00:00Z");
  it("says hours, then days", () => {
    expect(ago("2026-11-27T09:00:00Z", now)).toBe("3 hours ago");
    expect(ago("2026-11-25T12:00:00Z", now)).toBe("2 days ago");
    expect(ago("2026-11-26T11:00:00Z", now)).toBe("yesterday");
  });
  it("is null with no time, and never says the future", () => {
    expect(ago(null, now)).toBeNull();
    expect(ago("nonsense", now)).toBeNull();
    expect(ago("2026-11-27T13:00:00Z", now)).toBe("this hour");
  });
});
