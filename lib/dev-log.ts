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
