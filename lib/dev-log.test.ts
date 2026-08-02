import { afterEach, describe, expect, it, vi } from "vitest";
import { logApiError, logVendorTiming } from "./dev-log";

const VENDOR_TIMING_RE = /^\[vendor\] completed in \d+ms$/;

describe("logApiError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs the message of an Error instance", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    logApiError("[tag]", new Error("boom"));
    expect(errorSpy).toHaveBeenCalledWith("[tag]", "boom");
  });

  it("stringifies and truncates a non-Error value to 500 chars", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const huge = "x".repeat(1000);
    logApiError("[tag]", huge);
    expect(errorSpy).toHaveBeenCalledWith("[tag]", "x".repeat(500));
  });

  it("does not truncate a short non-Error value", () => {
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    logApiError("[tag]", { code: 42 });
    expect(errorSpy).toHaveBeenCalledWith("[tag]", "[object Object]");
  });
});

describe("logVendorTiming", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs a rounded elapsed-ms message", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const start = performance.now() - 42;
    logVendorTiming("[vendor]", start);
    expect(logSpy).toHaveBeenCalledTimes(1);
    const [msg] = logSpy.mock.calls[0];
    expect(msg).toMatch(VENDOR_TIMING_RE);
  });
});
