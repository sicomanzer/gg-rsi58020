/**
 * Exponential Moving Average (EMA) latest value.
 * @param {number[]} values
 * @param {number} period
 */
export function ema(values, period) {
  if (!Array.isArray(values) || values.length < period) return null;
  const k = 2 / (period + 1);

  // Seed: SMA of first `period`
  let prev = 0;
  for (let i = 0; i < period; i++) prev += values[i];
  prev /= period;

  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
  }
  return prev;
}

