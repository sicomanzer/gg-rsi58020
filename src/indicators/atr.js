/**
 * ATR (Average True Range) latest value (Wilder).
 * @param {{ high: number, low: number, close: number }[]} quotes
 * @param {number} period
 */
export function atr(quotes, period = 14) {
  if (!Array.isArray(quotes) || quotes.length < period + 2) return null;

  const trs = [];
  for (let i = 1; i < quotes.length; i++) {
    const h = quotes[i]?.high;
    const l = quotes[i]?.low;
    const prevClose = quotes[i - 1]?.close;
    if (![h, l, prevClose].every((x) => typeof x === "number" && Number.isFinite(x))) continue;

    const tr = Math.max(h - l, Math.abs(h - prevClose), Math.abs(l - prevClose));
    trs.push(tr);
  }
  if (trs.length < period) return null;

  // Initial ATR
  let atrVal = 0;
  for (let i = 0; i < period; i++) atrVal += trs[i];
  atrVal /= period;

  // Wilder smoothing
  for (let i = period; i < trs.length; i++) {
    atrVal = (atrVal * (period - 1) + trs[i]) / period;
  }
  return atrVal;
}

