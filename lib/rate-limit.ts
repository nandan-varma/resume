// ponytail: per-instance in-memory; add Upstash when scaling multi-instance
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const prev = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (prev.length >= max) {
    return false;
  }
  prev.push(now);
  hits.set(key, prev);
  return true;
}
