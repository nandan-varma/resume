import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_MODEL_ID,
  isValidModelId,
  models,
  resolveModel,
} from "./models";

describe("isValidModelId", () => {
  it("returns true for every known model id", () => {
    for (const model of models) {
      expect(isValidModelId(model.id)).toBe(true);
    }
  });

  it("returns false for an unknown id", () => {
    expect(isValidModelId("not-a-real-model")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isValidModelId("")).toBe(false);
  });
});

describe("resolveModel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("resolves a known id without falling back", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const knownId = models[0].id;

    expect(() => resolveModel(knownId)).not.toThrow();
    expect(logSpy).toHaveBeenCalledWith(`[models] using ${knownId}`);
  });

  it("falls back to the default model for an unknown id", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    expect(() => resolveModel("totally-bogus-id")).not.toThrow();
    expect(logSpy).toHaveBeenCalledWith(
      `[models] unknown modelId "totally-bogus-id", falling back to ${DEFAULT_MODEL_ID}`
    );
  });

  it("DEFAULT_MODEL_ID is itself a valid, known model id", () => {
    expect(isValidModelId(DEFAULT_MODEL_ID)).toBe(true);
  });
});
