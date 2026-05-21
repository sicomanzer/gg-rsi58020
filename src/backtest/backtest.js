import { evaluateRule } from "../scanner/ruleEngine.js";
import { estimateLookbackFromRule } from "../scanner/ruleLookback.js";
import { normalizeTimeframe } from "../utils/timeframe.js";

function iso(d) {
  return new Date(d).toISOString();
}

/**
 * @param {any[]} candlesRows
 */
function rowsToQuotes(candlesRows) {
  return candlesRows.map((r) => ({
    date: new Date(r.date),
    open: r.open,
    high: r.high,
    low: r.low,
    close: r.close,
    volume: r.volume,
    adjclose: r.adjclose
  }));
}

/**
 * @param {any[]} quotes
 */
function closesFromQuotes(quotes) {
  return quotes.map((q) => q?.close).filter((x) => typeof x === "number" && Number.isFinite(x));
}

/**
 * Run simple long-only backtest:
 * - Enter: when rule matched on bar i, buy at bar i+1 OPEN
 * - Exit: after holdBars bars, sell at bar exit CLOSE
 * - One position per symbol at a time
 *
 * @param {{
 *  rule: any,
 *  symbols: string[],
 *  timeframe: string,
 *  from: string,            // YYYY-MM-DD
 *  to: string,              // YYYY-MM-DD
 *  holdBars: number,
 *  feeBps?: number,
 *  candlesRepo: ReturnType<import("../data/candlesRepo.js").createCandlesRepo>,
 *  yahoo: import("../services/yahoo.js").YahooService,
 * }} params
 */
export async function runBacktest(params) {
  const tf = normalizeTimeframe(params.timeframe);
  const holdBars = Math.max(1, Math.floor(Number(params.holdBars || 5)));
  const feeBps = Number(params.feeBps ?? 10); // 0.10% per side default

  const requiredLookback = estimateLookbackFromRule(params.rule);
  const lookbackBars = Math.max(requiredLookback, 30);

  // Expand fetch window backwards to have enough lookback candles for the first signal evaluation
  const fromDate = new Date(params.from);
  const toDate = new Date(params.to);
  const fromWithLookback = new Date(fromDate.getTime() - (tf === "1W" ? 7 : 1) * lookbackBars * 24 * 60 * 60 * 1000);

  const trades = [];

  for (const symbol of params.symbols) {
    // Ensure candles exist in DB by calling yahoo (it will cache to sqlite)
    await params.yahoo.fetchQuotes({ symbol, timeframe: tf, period: lookbackBars });

    const rows = await params.candlesRepo.getCandlesBetween({
      symbol,
      timeframe: tf,
      fromIso: iso(fromWithLookback),
      toIso: iso(toDate)
    });
    const quotesAll = rowsToQuotes(rows);

    // find starting index at/from requested fromDate
    const startIdx = quotesAll.findIndex((q) => q.date >= fromDate);
    if (startIdx === -1) continue;

    let inPos = false;
    let entry = null;

    for (let i = Math.max(startIdx, lookbackBars); i < quotesAll.length; i++) {
      const now = quotesAll[i];
      if (!now?.date || now.date > toDate) break;

      if (!inPos) {
        const window = quotesAll.slice(0, i + 1);
        const closes = closesFromQuotes(window);
        if (closes.length < lookbackBars) continue;

        const { matched } = evaluateRule(params.rule, { quotes: window, closes });
        if (!matched) continue;

        const next = quotesAll[i + 1];
        if (!next || typeof next.open !== "number") continue;

        entry = {
          symbol,
          entryDate: next.date,
          entryPrice: next.open
        };
        inPos = true;
      } else {
        // Exit after holdBars completed since entry bar index
        const entryIdx = quotesAll.findIndex((q) => q.date.getTime() === entry.entryDate.getTime());
        const exitIdx = entryIdx + (holdBars - 1);
        if (exitIdx <= i) {
          const exitBar = quotesAll[exitIdx];
          if (!exitBar || typeof exitBar.close !== "number") {
            inPos = false;
            entry = null;
            continue;
          }

          const gross = (exitBar.close - entry.entryPrice) / entry.entryPrice;
          const fee = (feeBps / 10000) * 2; // entry + exit
          const net = gross - fee;

          trades.push({
            symbol,
            timeframe: tf,
            entryDate: entry.entryDate.toISOString(),
            exitDate: exitBar.date.toISOString(),
            entryPrice: entry.entryPrice,
            exitPrice: exitBar.close,
            grossReturn: gross,
            netReturn: net,
            holdBars,
            feeBps
          });

          inPos = false;
          entry = null;
        }
      }
    }
  }

  // Sort trades by exit time for equity curve
  trades.sort((a, b) => new Date(a.exitDate) - new Date(b.exitDate));

  let equity = 1;
  let peak = 1;
  let maxDrawdown = 0;
  let wins = 0;
  let sum = 0;

  for (const t of trades) {
    equity *= 1 + t.netReturn;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, (peak - equity) / peak);
    if (t.netReturn > 0) wins++;
    sum += t.netReturn;
  }

  const tradesCount = trades.length;
  const winRate = tradesCount ? wins / tradesCount : 0;
  const avgReturn = tradesCount ? sum / tradesCount : 0;

  return {
    meta: {
      timeframe: tf,
      from: params.from,
      to: params.to,
      symbolsCount: params.symbols.length,
      tradesCount,
      holdBars,
      feeBps,
      requiredLookback,
      lookbackBars,
      generatedAt: new Date().toISOString()
    },
    stats: {
      winRate,
      avgReturn,
      maxDrawdown,
      equityFinal: equity
    },
    trades
  };
}

