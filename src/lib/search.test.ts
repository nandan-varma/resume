import { describe, expect, it } from "vitest";
import { parseList, parseSearch } from "./search";
import { type Suggestion, suggestionUrl } from "./suggestions";

describe("parseList", () => {
  it("splits on commas, trims, drops short items and caps the count", () => {
    expect(
      parseList(" backend engineer, , a,platform engineer ,sre", 3),
    ).toEqual(["backend engineer", "platform engineer", "sre"]);
    expect(parseList(null, 3)).toEqual([]);
  });
});

describe("parseSearch", () => {
  it("reads every Tallo filter from the URL", () => {
    const q = parseSearch(
      new URLSearchParams(
        "title=sre, devops&company=Stripe&place=Seattle&country=us,ca,usa&remote=on&recent=30&sort=recent&cursor=abc",
      ),
    );
    expect(q).toMatchObject({
      title: ["sre", "devops"],
      company: ["Stripe"],
      place: ["Seattle"],
      country: ["US", "CA"],
      remote: true,
      postedWithin: 30,
      sort: "recent",
      cursor: "abc",
      searchable: true,
    });
  });

  it("needs a title or a company, and ignores bad values", () => {
    expect(parseSearch(new URLSearchParams("")).searchable).toBe(false);
    expect(parseSearch(new URLSearchParams("company=Stripe")).searchable).toBe(
      true,
    );
    const bad = parseSearch(
      new URLSearchParams("title=sre&recent=9999&sort=nope"),
    );
    expect(bad.postedWithin).toBeUndefined();
    expect(bad.sort).toBe("relevance");
  });
});

describe("suggestionUrl", () => {
  it("links to a search with the suggested titles", () => {
    const s: Suggestion = {
      label: "x",
      titles: ["backend engineer", "platform engineer"],
      remote: true,
      why: "",
    };
    const params = new URL(suggestionUrl(s), "http://x").searchParams;
    expect(parseSearch(params)).toMatchObject({
      title: ["backend engineer", "platform engineer"],
      remote: true,
    });
  });
});
