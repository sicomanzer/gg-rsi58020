import { sma } from "./sma.js";
import { stddev } from "./stddev.js";

/**
 * Bollinger Bands (latest).
 * @param {number[]} closes
 * @param {{ period: number, std: number }} params
 */
export function bollinger(closes, params) {
  const period = params?.period ?? 20;
  const s = params?.std ?? 2;
  const mid = sma(closes, period);
  const sd = stddev(closes, period);
  if (mid == null || sd == null) return null;
  const upper = mid + s * sd;
  const lower = mid - s * sd;
  const last = closes.at(-1);
  const percentB = typeof last === "number" ? (last - lower) / (upper - lower) : null;
  return { middle: mid, upper, lower, percentB };
}

