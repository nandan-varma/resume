/**
 * Characters that never belong in a resume: control and zero-width characters
 * (invisible, and they break keyword matching), private-use glyphs, and emoji
 * or dingbats (✓ ★ ➤ 📞 …), which Arial cannot draw and ATS software reads as
 * garbage. Letters from any language, punctuation and arrows are kept.
 */
const isUnsafe = (c: number) =>
  c === 0x7f ||
  (c >= 0x200b && c <= 0x200f) || // zero-width spaces and direction marks
  (c >= 0x202a && c <= 0x202e) ||
  c === 0x2060 ||
  c === 0xfeff ||
  c === 0xfe0f || // emoji presentation selector
  (c >= 0xe000 && c <= 0xf8ff) || // private use
  (c >= 0x2600 && c <= 0x27bf) || // misc symbols and dingbats
  (c >= 0x2b00 && c <= 0x2bff) ||
  (c >= 0x1f000 && c <= 0x1faff); // emoji and pictographs

/** Remove unsafe characters. Line breaks and tabs survive only when asked. */
export const stripUnsafe = (text: string, keepBreaks = false) => {
  let out = "";
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    if (c < 32) {
      if (keepBreaks && (c === 10 || c === 9)) {
        out += ch;
      }
      continue;
    }
    if (!isUnsafe(c)) {
      out += ch;
    }
  }
  return out;
};

/** One clean line: unsafe characters gone, non-breaking spaces and runs of whitespace collapsed. */
export const cleanLine = (text: string) =>
  stripUnsafe(text.replace(/ /g, " ").replace(/[\r\n\t]+/g, " "))
    .replace(/\s+/g, " ")
    .trim();
