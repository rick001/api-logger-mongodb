export interface RateLimitResult {
  limited: boolean;
  retryAfterMs?: number;
}

interface RateLimitState {
  windowStart: number;
  count: number;
  blockedUntil: number | null;
}

export class InMemoryRateLimiter {
  private states = new Map<string, RateLimitState>();

  constructor(
    private readonly windowMs: number,
    private readonly maxRequests: number,
    private readonly blockDurationMs: number
  ) {}

  check(key: string, now = Date.now()): RateLimitResult {
    const existing = this.states.get(key);
    if (!existing) {
      this.states.set(key, { windowStart: now, count: 1, blockedUntil: null });
      return { limited: false };
    }

    if (existing.blockedUntil !== null && now < existing.blockedUntil) {
      return { limited: true, retryAfterMs: existing.blockedUntil - now };
    }

    if (now - existing.windowStart >= this.windowMs) {
      existing.windowStart = now;
      existing.count = 1;
      existing.blockedUntil = null;
      return { limited: false };
    }

    existing.count += 1;
    if (existing.count <= this.maxRequests) {
      return { limited: false };
    }

    existing.blockedUntil = now + this.blockDurationMs;
    return { limited: true, retryAfterMs: this.blockDurationMs };
  }

  cleanup(now = Date.now()): void {
    for (const [key, state] of this.states) {
      const stale =
        now - state.windowStart > this.windowMs * 2 &&
        (state.blockedUntil === null || now >= state.blockedUntil);
      if (stale) {
        this.states.delete(key);
      }
    }
  }
}
