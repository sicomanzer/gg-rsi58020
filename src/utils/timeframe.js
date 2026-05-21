export function normalizeTimeframe(tf) {
  const t = String(tf || "").toUpperCase().trim();
  if (t === "1W" || t === "1WK" || t === "W" || t === "WEEK") return "1W";
  return "1D";
}

export function toYahooInterval(timeframe) {
  return normalizeTimeframe(timeframe) === "1W" ? "1wk" : "1d";
}

export function suggestedDaysBack({ timeframe, period }) {
  const tf = normalizeTimeframe(timeframe);
  // Simple heuristic: weekly needs much longer history to accumulate enough candles
  return tf === "1W" ? Math.max(365, period * 10 * 7) : Math.max(60, period * 10);
}

export function toYahooSymbol(setSymbol) {
  // SET symbols on Yahoo Finance typically use ".BK"
  return `${String(setSymbol).trim().toUpperCase()}.BK`;
}

