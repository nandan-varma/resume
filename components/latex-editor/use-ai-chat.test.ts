import { describe, expect, it } from "vitest";
import { applyEdits, collapseBlankLines } from "./use-ai-chat";

describe("collapseBlankLines", () => {
  it("keeps a single blank line as-is", () => {
    const { out } = collapseBlankLines(["a", "", "b"]);
    expect(out).toEqual(["a", "", "b"]);
  });

  it("collapses consecutive blank lines to one", () => {
    const { out } = collapseBlankLines(["a", "", "", "", "b"]);
    expect(out).toEqual(["a", "", "b"]);
  });

  it("trims each surviving line", () => {
    const { out } = collapseBlankLines(["  a  ", "   ", "b\t"]);
    expect(out).toEqual(["a", "", "b"]);
  });

  it("tracks the original index of each surviving line", () => {
    // Blank lines at index 1 and 2 collapse into the one at index 1.
    const { out, idx } = collapseBlankLines(["a", "", "", "b"]);
    expect(out).toEqual(["a", "", "b"]);
    expect(idx).toEqual([0, 1, 3]);
  });
});

describe("applyEdits", () => {
  it("pass 1: applies an exact substring match", () => {
    const result = applyEdits("hello world", [
      { find: "world", replace: "there" },
    ]);
    expect(result).toEqual({ next: "hello there", applied: 1 });
  });

  it("pass 2: matches when only indentation differs", () => {
    const source = "function f() {\n    return 1;\n}";
    const find = "function f() {\nreturn 1;\n}";
    const result = applyEdits(source, [
      { find, replace: "function f() {\n    return 2;\n}" },
    ]);
    expect(result).toEqual({
      next: "function f() {\n    return 2;\n}",
      applied: 1,
    });
  });

  it("pass 3: matches when only blank-line count differs", () => {
    const source = "a\n\n\nb\nc";
    const find = "a\n\nb\nc";
    const result = applyEdits(source, [{ find, replace: "X" }]);
    expect(result).toEqual({ next: "X", applied: 1 });
  });

  it("leaves the source untouched when nothing matches", () => {
    const result = applyEdits("hello", [{ find: "nope", replace: "x" }]);
    expect(result).toEqual({ next: "hello", applied: 0 });
  });

  it("applies only the edits that match, in order, counting just the hits", () => {
    const result = applyEdits("aaa bbb", [
      { find: "aaa", replace: "AAA" },
      { find: "zzz", replace: "Z" },
    ]);
    expect(result).toEqual({ next: "AAA bbb", applied: 1 });
  });

  it("normalizes CRLF line endings in the find string before matching", () => {
    const result = applyEdits("line1\nline2", [
      { find: "line1\r\nline2", replace: "X" },
    ]);
    expect(result).toEqual({ next: "X", applied: 1 });
  });

  it("applies sequential edits against the progressively-updated source", () => {
    const result = applyEdits("one two three", [
      { find: "one", replace: "1" },
      { find: "1 two", replace: "1 2" },
    ]);
    expect(result).toEqual({ next: "1 2 three", applied: 2 });
  });
});
