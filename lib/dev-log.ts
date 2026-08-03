import { APICallError } from "ai";

// AI providers report transient capacity errors inconsistently — a clean
// HTTP 429, or (e.g. Nvidia NIM via OpenRouter) an HTTP 500 wrapping a
// "ResourceExhausted"/rate-limit message in its body. Match both shapes so
// these surface as a friendly "try again" message instead of a raw upstream
// stack trace.
const RATE_LIMIT_PATTERN = /resourceexhausted|rate limit|too many requests/i;

export function isRateLimitError(err: unknown): boolean {
  if (APICallError.isInstance(err) && err.statusCode === 429) {
    return true;
  }
  const message = err instanceof Error ? err.message : String(err);
  return RATE_LIMIT_PATTERN.test(message);
}

// AI SDK errors carry the full request/response body (e.g. base64 PDFs) as
// enumerable properties, so console.error(err) on them floods the console.
// streamText's onError passes `unknown` — providers occasionally throw a
// plain object (not an Error) on stream/network failures, which stringifies
// to a useless "[object Object]"; fall back to its .message before that.
export function logApiError(tag: string, err: unknown) {
  if (err instanceof Error) {
    console.error(tag, err.message);
    return;
  }
  if (err && typeof err === "object" && "message" in err) {
    console.error(tag, String(err.message).slice(0, 500));
    return;
  }
  console.error(tag, String(err).slice(0, 500));
}

export function logVendorTiming(tag: string, startedAt: number) {
  console.log(
    `${tag} completed in ${Math.round(performance.now() - startedAt)}ms`
  );
}
