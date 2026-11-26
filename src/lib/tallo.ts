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
  company: string[];
  /** Place words; "remote" is treated by Tallo as a work-mode filter. */
  location: string[];
  country: string[];
  postedWithin?: number;
  sort?: "relevance" | "recent" | "posted" | "added";
  cursor?: string;
};

export async function searchJobs(params: SearchParams) {
  const { data, error } = await tallo.GET("/v1/search", {
    params: { query: { ...params, limit: 20 } },
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
