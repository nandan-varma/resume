import { describe, expect, it } from "vitest";
import { avatarFor, hrefFor } from "./links";

describe("hrefFor", () => {
  it("links emails, phone numbers and web addresses", () => {
    expect(hrefFor("ada@example.com")).toBe("mailto:ada@example.com");
    expect(hrefFor("+1 (206) 837-3361")).toBeUndefined(); // spaces: written as text, never guessed
    expect(hrefFor("206-837-3361")).toBe("tel:2068373361");
    expect(hrefFor("github.com/nandan-varma")).toBe(
      "https://github.com/nandan-varma",
    );
    expect(hrefFor("https://ada.dev/about")).toBe("https://ada.dev/about");
    expect(hrefFor("www.ada.dev")).toBe("https://www.ada.dev");
  });

  it("leaves everything else as plain text", () => {
    expect(hrefFor("")).toBeUndefined();
    expect(hrefFor("Seattle, WA")).toBeUndefined();
    expect(hrefFor("my portfolio")).toBeUndefined();
    expect(hrefFor("C++/17")).toBeUndefined();
  });
});

describe("avatarFor", () => {
  it("is stable and picks a sensible initial", () => {
    expect(avatarFor("Stripe")).toEqual(avatarFor("stripe"));
    expect(avatarFor("  Toss ").initial).toBe("T");
    expect(avatarFor("(?) 3M").initial).toBe("3");
    expect(avatarFor("").initial).toBe("?");
  });
});
