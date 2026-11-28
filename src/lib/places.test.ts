import { describe, expect, it } from "vitest";
import { otherPlaces } from "./places";

const v = (id: string, location: string | null, workMode = null as never) => ({
  id,
  location,
  workMode,
});

describe("otherPlaces", () => {
  it("leaves out the place you are viewing, even when it repeats", () => {
    const here = v("1", "Raleigh");
    expect(
      otherPlaces(here, [here, v("2", "Raleigh"), v("3", "Raleigh")]),
    ).toEqual([]);
  });

  it("groups repeats of another place and counts them", () => {
    const here = v("1", "Raleigh");
    expect(
      otherPlaces(here, [
        here,
        v("2", "Austin"),
        v("3", "Austin"),
        v("4", "Denver"),
        v("5", null),
      ]),
    ).toEqual([
      { id: "2", location: "Austin", workMode: null, count: 2 },
      { id: "4", location: "Denver", workMode: null, count: 1 },
    ]);
  });
});
