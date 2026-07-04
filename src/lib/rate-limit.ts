import { NextRequest } from "next/server";

// ── Per-IP in-memory rate limiter (same pattern as /api/portal/login).
// Best-effort and per server instance — enough to blunt abuse of public
// endpoints without adding infrastructure. Each route creates its own bucket.

interface Bucket {
  count: number;
  resetAt: number;
}

export function clientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function createRateLimiter(maxPerWindow: number, windowMs = 60_000) {
  const hits = new Map<string, Bucket>();

  return function isRateLimited(ip: string, nowMs = Date.now()): boolean {
    const rec = hits.get(ip);
    if (!rec || nowMs >= rec.resetAt) {
      hits.set(ip, { count: 1, resetAt: nowMs + windowMs });
      // Opportunistically prune expired entries so the map can't grow unbounded.
      if (hits.size > 5000) {
        for (const [k, v] of hits) if (v.resetAt <= nowMs) hits.delete(k);
      }
      return false;
    }
    rec.count += 1;
    return rec.count > maxPerWindow;
  };
}
