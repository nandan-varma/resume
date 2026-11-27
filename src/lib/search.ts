export const SORTS = [
  { value: "relevance", label: "Best match" },
  { value: "recent", label: "Newest" },
  { value: "posted", label: "Newest (dated only)" },
  { value: "added", label: "Recently added" },
] as const;
type Sort = (typeof SORTS)[number]["value"];

export const WINDOWS = [
  { value: "", label: "Any time" },
  { value: "1", label: "Last 24 hours" },
  { value: "7", label: "Last week" },
  { value: "30", label: "Last month" },
  { value: "90", label: "Last 3 months" },
] as const;

/** Split "a, b" into at most `max` trimmed items of at least `min` characters. */
export const parseList = (
  value: string | null | undefined,
  max: number,
  min = 2,
) =>
  (value ?? "")
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter((v) => v.length >= min)
    .slice(0, max);

/** Everything the search form can say, read from the page URL. */
export const parseSearch = (params: URLSearchParams) => {
  const title = parseList(params.get("title"), 4);
  const company = parseList(params.get("company"), 4);
  const place = parseList(params.get("place"), 7);
  const country = parseList(params.get("country"), 8).filter(
    (c) => c.length === 2,
  );
  const remote = params.get("remote") === "on";
  const days = Number(params.get("recent"));
  const sort =
    SORTS.find((s) => s.value === params.get("sort"))?.value ?? "relevance";

  return {
    title,
    company,
    place,
    country: country.map((c) => c.toUpperCase()),
    remote,
    postedWithin:
      Number.isInteger(days) && days >= 1 && days <= 365 ? days : undefined,
    sort: sort as Sort,
    cursor: params.get("cursor") ?? undefined,
    /** Tallo needs a title or a company. */
    searchable: title.length > 0 || company.length > 0,
  };
};
