type Variant = {
  id: string;
  location: string | null;
  workMode: "remote" | "hybrid" | "onsite" | null;
};

/**
 * The other places a role is open. Tallo lists every posting of a role, and a
 * city with several openings repeats, so group by place, leave out the place
 * you are already looking at, and keep a count and one posting to open.
 */
export function otherPlaces(here: Variant, variants: Variant[]) {
  const key = (v: Variant) => `${v.location}|${v.workMode}`;
  const places = new Map<
    string,
    {
      id: string;
      location: string;
      workMode: Variant["workMode"];
      count: number;
    }
  >();
  for (const v of variants) {
    if (v.id === here.id || !v.location || key(v) === key(here)) {
      continue;
    }
    const seen = places.get(key(v));
    if (seen) {
      seen.count += 1;
    } else {
      places.set(key(v), {
        id: v.id,
        location: v.location,
        workMode: v.workMode,
        count: 1,
      });
    }
  }
  return [...places.values()];
}
