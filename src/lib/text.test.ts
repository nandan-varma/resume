import { describe, expect, it } from "vitest";
import { cleanLine, stripUnsafe } from "./text";

describe("text safety", () => {
  it("removes emoji, dingbats, zero-width and control characters", () => {
    expect(stripUnsafe("☎ 555 📞 call​ me ✓")).toBe(" 555  call me ");
    expect(stripUnsafe("a\u0000b\u0007c")).toBe("abc");
  });

  it("keeps real text in any language, punctuation and arrows", () => {
    expect(stripUnsafe("Zoë · 日本語 – Go → Rust (50%)")).toBe(
      "Zoë · 日本語 – Go → Rust (50%)",
    );
  });

  it("keeps line breaks only when asked", () => {
    expect(stripUnsafe("a\nb")).toBe("ab");
    expect(stripUnsafe("a\nb", true)).toBe("a\nb");
  });

  it("makes one clean line", () => {
    expect(cleanLine("  Ada  \n Lovelace  ✓ ")).toBe("Ada Lovelace");
  });
});
