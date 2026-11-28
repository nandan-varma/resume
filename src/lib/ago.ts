const AGO = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "2 days ago" for an ISO time, or null when there is none. */
export function ago(iso: string | null, now = Date.now()) {
  const then = iso ? Date.parse(iso) : Number.NaN;
  if (Number.isNaN(then)) {
    return null;
  }
  const hours = Math.round((now - then) / 3_600_000);
  return hours < 24
    ? AGO.format(-Math.max(hours, 0), "hour")
    : AGO.format(-Math.floor(hours / 24), "day");
}
