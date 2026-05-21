export function parseNumber(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/**
 * Very small token-bucket rate limiter (in-memory).
 * @param {{ capacity: number, refillPerSec: number }} cfg
 */
export function createRateLimiter(cfg) {
  let tokens = cfg.capacity;
  let last = Date.now();
  return {
    /**
     * @param {number} cost
     */
    async take(cost = 1) {
      // refill
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;
      tokens = Math.min(cfg.capacity, tokens + dt * cfg.refillPerSec);

      if (tokens >= cost) {
        tokens -= cost;
        return;
      }
      // wait enough time to refill
      const need = cost - tokens;
      const waitMs = Math.ceil((need / cfg.refillPerSec) * 1000);
      await new Promise((r) => setTimeout(r, waitMs));
      // after waiting, take again (recursive-safe small)
      return this.take(cost);
    }
  };
}
