import { ema } from "./ema.js";

/**
 * MACD latest values.
 * @param {number[]} closes
 * @param {{ fast: number, slow: number, signal: number }} params
 */
export function macd(closes, params) {
  const fast = params?.fast ?? 12;
  const slow = params?.slow ?? 26;
  const signal = params?.signal ?? 9;
  if (closes.length < slow + signal) return null;

  // Build MACD line series to compute signal EMA
  const macdLine = [];
  for (let i = 0; i < closes.length; i++) {
    const slice = closes.slice(0, i + 1);
    const ef = ema(slice, fast);
    const es = ema(slice, slow);
    if (ef == null || es == null) continue;
    macdLine.push(ef - es);
  }
  if (macdLine.length < signal) return null;
  const signalLine = ema(macdLine, signal);
  const lastMacd = macdLine.at(-1);
  if (signalLine == null || lastMacd == null) return null;
  const hist = lastMacd - signalLine;
  return { macd: lastMacd, signal: signalLine, hist };
}

