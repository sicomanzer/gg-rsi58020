import { normalizeTimeframe } from "../utils/timeframe.js";
import { rsiWilder } from "../indicators/rsi.js";

/**
 * @param {{
 *  symbol: string,
 *  timeframe: string,
 *  period: number,
 *  overbought: number,
 *  oversold: number,
 *  includeYield?: boolean,
 *  yahoo: import("../services/yahoo.js").YahooService
 * }} params
 */
export async function scanRsiOne(params) {
  const tf = normalizeTimeframe(params.timeframe);
  const includeYield = params.includeYield !== false;

  const { yahooSymbol, quotes } = await params.yahoo.fetchQuotes({
    symbol: params.symbol,
    timeframe: tf,
    period: params.period
  });

  const closes = quotes.map((c) => c?.close).filter((x) => typeof x === "number" && Number.isFinite(x));
  const last = quotes.at(-1) ?? null;
  const yieldPercent = includeYield ? await params.yahoo.fetchDividendYieldPercent({ symbol: params.symbol }) : null;

  if (closes.length < params.period + 2) {
    return {
      symbol: params.symbol,
      yahooSymbol,
      timeframe: tf,
      rsi: null,
      yieldPercent,
      close: closes.at(-1) ?? null,
      date: last?.date ?? null,
      error: `ข้อมูลไม่พอสำหรับคำนวณ RSI (ต้องมีอย่างน้อย ${params.period + 2} จุด)`,
      signal: "neutral"
    };
  }

  const rsi = rsiWilder(closes, params.period);
  const signal = rsi >= params.overbought ? "overbought" : rsi <= params.oversold ? "oversold" : "neutral";

  return {
    symbol: params.symbol,
    yahooSymbol,
    timeframe: tf,
    rsi,
    yieldPercent,
    close: closes.at(-1) ?? null,
    date: last?.date ?? null,
    error: null,
    signal
  };
}
