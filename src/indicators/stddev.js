/**
 * Population standard deviation of last `period` values.
 * @param {number[]} values
 * @param {number} period
 */
export function stddev(values, period) {
  if (!Array.isArray(values) || values.length < period) return null;
  const start = values.length - period;
  let mean = 0;
  for (let i = start; i < values.length; i++) mean += values[i];
  mean /= period;

  let v = 0;
  for (let i = start; i < values.length; i++) {
    const d = values[i] - mean;
    v += d * d;
  }
  v /= period;
  return Math.sqrt(v);
}

