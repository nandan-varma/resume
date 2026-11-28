import createClient from "openapi-fetch";
import type { paths } from "./tallo-api";

/** Typed client generated from Tallo's OpenAPI document (`pnpm gen:tallo`). */
const tallo = createClient<paths>({
  baseUrl: "https://tallo.nandan.fyi",
  // Cloudflare's edge cache does the caching Tallo asks for. It follows Tallo's
  // own Cache-Control (search 15 minutes, a posting 1 hour), so there is no TTL
  // to keep in step here.
  fetch: (request) => fetch(request, { cf: { cacheEverything: true } }),
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

/** Tallo could not answer: it is busy or down. A missing or closed posting is not an error (see `getJob`). */
export class TalloError extends Error {
  constructor(
    message: string,
    readonly kind: "busy" | "unavailable",
  ) {
    super(message);
  }
}

const BUSY = "Job search is busy right now. Please try again in a moment.";
const DOWN = "Job search is unavailable right now. Please try again shortly.";

/** Turn a failed response into something a person can act on. */
function failure(
  status: number,
  error: { error: { message: string } } | undefined,
) {
  if (status === 429) {
    return new TalloError(BUSY, "busy");
  }
  // Tallo words a rejected query (400) for the person who made it.
  if (status === 400 && error) {
    return new Error(error.error.message);
  }
  return new TalloError(DOWN, "unavailable");
}

export async function searchJobs(params: SearchParams) {
  const { data, error, response } = await tallo.GET("/v1/search", {
    params: { query: { ...params, limit: 20 } },
    querySerializer: { array: { style: "form", explode: true } },
  });
  if (!data) {
    throw failure(response.status, error);
  }
  return data;
}

/**
 * The whole posting, description included. Null when it is closed (410) or
 * unknown (404); throws `TalloError` when Tallo itself could not answer, so a
 * hiccup is never reported as "this job is gone".
 */
export async function getJob(id: string) {
  const { data, error, response } = await tallo.GET("/v1/jobs/{id}", {
    params: { path: { id } },
  });
  if (data) {
    return data;
  }
  if (response.status === 404 || response.status === 410) {
    return null;
  }
  throw failure(response.status, error);
}
