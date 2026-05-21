/**
 * Simple Moving Average (SMA) latest value.
 * @param {number[]} values
 * @param {number} period
 */
export function sma(values, period) {
  if (!Array.isArray(values) || values.length < period) return null;
  let sum = 0;
  for (let i = values.length - period; i < values.length; i++) sum += values[i];
  return sum / period;
}

