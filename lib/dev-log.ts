// AI SDK errors carry the full request/response body (e.g. base64 PDFs) as
// enumerable properties, so console.error(err) on them floods the console.
export function logApiError(tag: string, err: unknown) {
  console.error(
    tag,
    err instanceof Error ? err.message : String(err).slice(0, 500)
  );
}

export function logVendorTiming(tag: string, startedAt: number) {
  console.log(
    `${tag} completed in ${Math.round(performance.now() - startedAt)}ms`
  );
}
