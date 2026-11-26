import createClient from "openapi-fetch";
import type { paths } from "./tallo-api";

const SEARCH_TTL = 15 * 60;
const POSTING_TTL = 60 * 60;

/** Typed client generated from Tallo's OpenAPI document (`pnpm gen:tallo`). */
const tallo = createClient<paths>({
  baseUrl: "https://tallo.nandan.fyi",
  // Tallo asks clients to cache rather than poll; Cloudflare's edge cache does it.
  fetch: (request) =>
    fetch(request, {
      cf: {
        cacheEverything: true,
        cacheTtl: request.url.includes("/v1/search") ? SEARCH_TTL : POSTING_TTL,
      },
    }),
});

export type SearchParams = {
  title: string[];
  location: string[];
  postedWithin?: number;
  cursor?: string;
};

export async function searchJobs({
  title,
  location,
  postedWithin,
  cursor,
}: SearchParams) {
  const { data, error } = await tallo.GET("/v1/search", {
    params: { query: { title, location, postedWithin, cursor, limit: 20 } },
    querySerializer: { array: { style: "form", explode: true } },
  });
  if (!data) {
    throw new Error(
      error?.error.message ?? "Job search is unavailable right now.",
    );
  }
  return data;
}

/** Returns null when the posting is missing or closed. */
export async function getJob(id: string) {
  const { data } = await tallo.GET("/v1/jobs/{id}", {
    params: { path: { id } },
  });
  return data ?? null;
}
