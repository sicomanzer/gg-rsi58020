import YahooFinance from "yahoo-finance2";
import { suggestedDaysBack, toYahooInterval, toYahooSymbol } from "../utils/timeframe.js";
import { createRateLimiter } from "../utils/number.js";

function normalizeYieldPercent(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  // Yahoo มักให้ค่าเป็นสัดส่วน (เช่น 0.034 = 3.4%) แต่บางฟิลด์อาจเป็น % แล้ว
  const pct = v <= 1.5 ? v * 100 : v;
  if (pct < 0 || pct > 100) return null;
  return Math.round(pct * 100) / 100;
}

export class YahooService {
  /**
   * @param {{
   *  candlesRepo?: ReturnType<import("../data/candlesRepo.js").createCandlesRepo>,
   *  defaults?: { dataTtlMinutes?: number }
   * }} deps
   */
  constructor(deps = {}) {
    // Keep notices minimal (historical() is deprecated and not used)
    this.yf = new YahooFinance({ suppressNotices: ["ripHistorical", "yahooSurvey"] });
    this.candlesRepo = deps.candlesRepo ?? null;
    this.defaults = deps.defaults ?? {};
    // Rough limiter: ~30 requests/minute (tunable later)
    this.limiter = createRateLimiter({ capacity: 10, refillPerSec: 0.5 });

    /** @type {Map<string, { at: number, yieldPercent: number | null }>} */
    this.yieldCache = new Map();
  }

  /**
   * Fetch candles for a SET symbol (via .BK) using Yahoo chart API.
   * @param {{ symbol: string, timeframe: string, period: number }} params
   * @returns {Promise<{ yahooSymbol: string, quotes: any[] }>}
   */
  async fetchQuotes({ symbol, timeframe, period }) {
    const yahooSymbol = toYahooSymbol(symbol);
    const daysBack = suggestedDaysBack({ timeframe, period });
    const fromIso = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    // If we have cached candles recent enough, use DB
    if (this.candlesRepo) {
      const ttlMinutes = Number(this.defaults.dataTtlMinutes ?? 60);
      const latest = await this.candlesRepo.getLatestCandle({ symbol, timeframe });
      if (latest?.fetched_at) {
        const ageMs = Date.now() - new Date(latest.fetched_at).getTime();
        if (ageMs < ttlMinutes * 60 * 1000) {
          const rows = await this.candlesRepo.getCandlesFrom({ symbol, timeframe, fromIso });
          return {
            yahooSymbol,
            quotes: rows.map((r) => ({
              date: new Date(r.date),
              open: r.open,
              high: r.high,
              low: r.low,
              close: r.close,
              volume: r.volume,
              adjclose: r.adjclose
            }))
          };
        }
      }
    }

    // Rate-limit upstream calls
    await this.limiter.take(1);

    const period1 = Math.floor(new Date(fromIso).getTime() / 1000);
    const period2 = Math.floor(Date.now() / 1000);

    const chart = await this.yf.chart(yahooSymbol, {
      period1,
      period2,
      interval: toYahooInterval(timeframe)
    });

    const quotes = Array.isArray(chart?.quotes) ? chart.quotes : [];

    // Persist to DB if enabled
    if (this.candlesRepo && quotes.length) {
      const startedAt = new Date().toISOString();
      try {
        await this.candlesRepo.upsertCandles({
          symbol,
          timeframe,
          rows: quotes,
          source: "yahoo"
        });
        await this.candlesRepo.addFetchLog({
          symbol,
          timeframe,
          source: "yahoo",
          startedAt,
          finishedAt: new Date().toISOString(),
          ok: true
        });
      } catch (e) {
        await this.candlesRepo.addFetchLog({
          symbol,
          timeframe,
          source: "yahoo",
          startedAt,
          finishedAt: new Date().toISOString(),
          ok: false,
          error: String(e?.message ?? e)
        });
      }
    }

    return { yahooSymbol, quotes };
  }

  /**
   * Fetch dividend yield (%). Uses in-memory cache to avoid extra upstream calls.
   * @param {{ symbol: string }} params
   * @returns {Promise<number | null>}
   */
  async fetchDividendYieldPercent({ symbol }) {
    const yahooSymbol = toYahooSymbol(symbol);
    const ttlMs = 24 * 60 * 60 * 1000; // 1 day
    const cached = this.yieldCache.get(yahooSymbol);
    if (cached && Date.now() - cached.at < ttlMs) return cached.yieldPercent;

    await this.limiter.take(1);
    const q = await this.yf.quote(yahooSymbol);

    /**
     * NOTE:
     * Yahoo fields are not consistent across tickers.
     * - Some tickers have trailingAnnualDividendYield = 0 but dividendYield is correct (e.g. AP.BK)
     * - Some tickers provide dividendYield as percent already (e.g. 6.93) while others provide ratio (e.g. 0.0416)
     */
    const trailingY = normalizeYieldPercent(q?.trailingAnnualDividendYield);
    const divY = normalizeYieldPercent(q?.dividendYield);

    let yieldPercent = null;
    // Prefer non-zero; fall back accordingly
    if (divY && divY > 0) yieldPercent = divY;
    else if (trailingY && trailingY > 0) yieldPercent = trailingY;
    else if (typeof q?.trailingAnnualDividendRate === "number" && typeof q?.regularMarketPrice === "number") {
      yieldPercent = normalizeYieldPercent(q.trailingAnnualDividendRate / q.regularMarketPrice);
    } else {
      yieldPercent = divY ?? trailingY ?? null; // may be 0 or null
    }

    this.yieldCache.set(yahooSymbol, { at: Date.now(), yieldPercent });
    return yieldPercent;
  }
}
