import express from "express";
import pLimit from "p-limit";
import fs from "fs/promises";
import path from "path";
import { clamp, parseNumber } from "../utils/number.js";
import { normalizeTimeframe, toYahooSymbol } from "../utils/timeframe.js";
import { scanRsiOne } from "../scanner/scanRsi.js";
import { evaluateRule } from "../scanner/ruleEngine.js";
import { estimateLookbackFromRule } from "../scanner/ruleLookback.js";
import { runBacktest } from "../backtest/backtest.js";
import { exportTradesCsv } from "../backtest/exportCsv.js";
import { projectRoot } from "../config.js";
import { updateSet100FromPdfUrl } from "../set100/updateSet100FromPdfUrl.js";

/**
 * @param {{
 *  config: import("../config.js").config,
 *  symbols: import("../services/symbols.js").SymbolsService,
 *  yahoo: import("../services/yahoo.js").YahooService,
 *  rules: import("../services/rules.js").RulesService,
 *  candlesRepo?: ReturnType<import("../data/candlesRepo.js").createCandlesRepo>,
 * }} deps
 */
export function createApiRouter(deps) {
  const router = express.Router();

  /** Simple in-memory cache to reduce calls to upstream. */
  const scanCache = new Map();
  const ruleScanCache = new Map();

  router.get("/rules", async (_req, res) => {
    try {
      const rules = await deps.rules.listRules();
      res.json({ data: rules });
    } catch (e) {
      res.status(500).json({ error: String(e?.message ?? e) });
    }
  });

  router.get("/provenance", async (_req, res) => {
    try {
      const stats = deps.candlesRepo ? await deps.candlesRepo.getDbStats() : { candlesCount: 0, lastFetchAt: null };
      res.json({
        meta: {
          source: "Yahoo Finance (chart API)",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          generatedAt: new Date().toISOString()
        },
        db: stats
      });
    } catch (e) {
      res.status(500).json({ error: String(e?.message ?? e) });
    }
  });

  router.post("/set100/update", async (req, res) => {
    try {
      const url =
        (typeof req.body?.url === "string" && req.body.url.trim()) ||
        "https://media.set.or.th/set/Documents/2025/Feb/SET50_100_H1_2025_revise.pdf";
      const out = await updateSet100FromPdfUrl({ url });
      return res.json(out);
    } catch (e) {
      return res.status(500).json({ error: String(e?.message ?? e) });
    }
  });

  router.get("/set100/meta", async (_req, res) => {
    try {
      const file = path.join(projectRoot, "data", "set100.meta.json");
      const raw = await fs.readFile(file, "utf-8");
      return res.json({ meta: JSON.parse(raw) });
    } catch {
      return res.json({ meta: null });
    }
  });

  router.get("/scan", async (req, res) => {
    try {
      const period = clamp(parseNumber(req.query.period, deps.config.defaults.period), 2, 200);
      const overbought = clamp(parseNumber(req.query.overbought, deps.config.defaults.overbought), 50, 100);
      const oversold = clamp(parseNumber(req.query.oversold, deps.config.defaults.oversold), 0, 50);
      const timeframe = normalizeTimeframe(req.query.timeframe ?? deps.config.defaults.timeframe);
      const minYieldPercent = clamp(parseNumber(req.query.minYieldPercent, 0), 0, 100);
      const includeYieldRequested = String(req.query.includeYield ?? "true").toLowerCase() !== "false";
      const includeYield = includeYieldRequested || minYieldPercent > 0;
      const concurrency = clamp(parseNumber(req.query.concurrency, deps.config.defaults.concurrency), 1, 20);
      const cacheSeconds = clamp(parseNumber(req.query.cacheSeconds, deps.config.defaults.cacheSeconds), 0, 600);

      const { symbols: allSymbols, mtimeMs } = await deps.symbols.loadSet100();
      let symbols = allSymbols;

      // Optional: scan only some symbols (for quick checks)
      const symbolsParam = typeof req.query.symbols === "string" ? req.query.symbols : "";
      if (symbolsParam.trim()) {
        const wanted = symbolsParam
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);
        symbols = symbols.filter((s) => wanted.includes(s));
      }

      const limitN = clamp(parseNumber(req.query.limitN, 0), 0, 1000);
      if (limitN > 0) symbols = symbols.slice(0, limitN);

      const cacheKey = JSON.stringify({
        period,
        overbought,
        oversold,
        timeframe,
        includeYield,
        minYieldPercent,
        concurrency,
        symbolsMtimeMs: mtimeMs,
        symbolsParam,
        limitN
      });

      const cached = scanCache.get(cacheKey);
      if (cached && Date.now() - cached.at < cacheSeconds * 1000) {
        return res.json(cached.result);
      }

      const limit = pLimit(concurrency);
      const rows = await Promise.all(
        symbols.map((s) =>
          limit(async () => {
            try {
              return await scanRsiOne({
                symbol: s,
                timeframe,
                period,
                overbought,
                oversold,
                includeYield,
                yahoo: deps.yahoo
              });
            } catch (e) {
              return {
                symbol: s,
                yahooSymbol: toYahooSymbol(s),
                timeframe,
                rsi: null,
                yieldPercent: null,
                close: null,
                date: null,
                error: String(e?.message ?? e),
                signal: "neutral"
              };
            }
          })
        )
      );

      const result = {
        meta: {
          source: "Yahoo Finance (chart API)",
          timeframe,
          period,
          overbought,
          oversold,
          includeYield,
          minYieldPercent,
          symbolsCount: symbols.length,
          set100ListMtimeMs: mtimeMs,
          generatedAt: new Date().toISOString()
        },
        data: minYieldPercent > 0 ? rows.filter((r) => typeof r.yieldPercent === "number" && r.yieldPercent >= minYieldPercent) : rows
      };

      if (minYieldPercent > 0) result.meta.filteredCount = result.data.length;

      scanCache.set(cacheKey, { at: Date.now(), result });
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ error: String(e?.message ?? e) });
    }
  });

  router.get("/scan/rule", async (req, res) => {
    try {
      const ruleId = typeof req.query.ruleId === "string" ? req.query.ruleId.trim() : "";
      if (!ruleId) return res.status(400).json({ error: "ต้องระบุ ruleId" });

      const rule = await deps.rules.loadRule(ruleId);

      const requestedPeriod = clamp(parseNumber(req.query.period, deps.config.defaults.period), 2, 300);
      const requiredLookback = estimateLookbackFromRule(rule);
      const period = Math.max(requestedPeriod, requiredLookback);
      const minYieldPercent = clamp(parseNumber(req.query.minYieldPercent, 0), 0, 100);
      const includeYieldRequested = String(req.query.includeYield ?? "true").toLowerCase() !== "false";
      const includeYield = includeYieldRequested || minYieldPercent > 0;
      const concurrency = clamp(parseNumber(req.query.concurrency, deps.config.defaults.concurrency), 1, 20);
      const cacheSeconds = clamp(parseNumber(req.query.cacheSeconds, deps.config.defaults.cacheSeconds), 0, 600);

      // timeframe: query overrides rule, else default
      const timeframe = normalizeTimeframe(req.query.timeframe ?? rule.timeframe ?? deps.config.defaults.timeframe);

      const { symbols: allSymbols, mtimeMs } = await deps.symbols.loadSet100();
      let symbols = allSymbols;

      const symbolsParam = typeof req.query.symbols === "string" ? req.query.symbols : "";
      if (symbolsParam.trim()) {
        const wanted = symbolsParam
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);
        symbols = symbols.filter((s) => wanted.includes(s));
      }

      const limitN = clamp(parseNumber(req.query.limitN, 0), 0, 1000);
      if (limitN > 0) symbols = symbols.slice(0, limitN);

      const cacheKey = JSON.stringify({
        ruleId,
        timeframe,
        period,
        includeYield,
        minYieldPercent,
        concurrency,
        symbolsMtimeMs: mtimeMs,
        symbolsParam,
        limitN
      });

      const cached = ruleScanCache.get(cacheKey);
      if (cached && Date.now() - cached.at < cacheSeconds * 1000) {
        return res.json(cached.result);
      }

      const limit = pLimit(concurrency);
      const rows = await Promise.all(
        symbols.map((s) =>
          limit(async () => {
            try {
              const { yahooSymbol, quotes } = await deps.yahoo.fetchQuotes({ symbol: s, timeframe, period });
              const closes = quotes.map((c) => c?.close).filter((x) => typeof x === "number" && Number.isFinite(x));
              const yieldPercent = includeYield ? await deps.yahoo.fetchDividendYieldPercent({ symbol: s }) : null;

              const { matched, indicators } = evaluateRule(rule, { quotes, closes });

              return {
                symbol: s,
                yahooSymbol,
                timeframe,
                matched,
                indicators,
                yieldPercent,
                close: closes.at(-1) ?? null,
                date: quotes.at(-1)?.date ?? null,
                error: null
              };
            } catch (e) {
              return {
                symbol: s,
                yahooSymbol: toYahooSymbol(s),
                timeframe,
                matched: false,
                indicators: {},
                yieldPercent: null,
                close: null,
                date: null,
                error: String(e?.message ?? e)
              };
            }
          })
        )
      );

      const matchedOnly = String(req.query.matchedOnly ?? "").toLowerCase() === "true";
      let data = matchedOnly ? rows.filter((r) => r.matched && !r.error) : rows;
      if (minYieldPercent > 0) data = data.filter((r) => typeof r.yieldPercent === "number" && r.yieldPercent >= minYieldPercent);

      const result = {
        meta: {
          source: "Yahoo Finance (chart API)",
          ruleId,
          ruleName: rule.name ?? ruleId,
          timeframe,
          lookbackPeriod: period,
          requiredLookback,
          includeYield,
          minYieldPercent,
          symbolsCount: symbols.length,
          generatedAt: new Date().toISOString()
        },
        data
      };

      if (minYieldPercent > 0) result.meta.filteredCount = data.length;

      ruleScanCache.set(cacheKey, { at: Date.now(), result });
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ error: String(e?.message ?? e) });
    }
  });

  router.post("/backtest/run", async (req, res) => {
    try {
      const body = req.body || {};
      const ruleId = String(body.ruleId || "").trim();
      const from = String(body.from || "").trim();
      const to = String(body.to || "").trim();
      if (!ruleId || !from || !to) return res.status(400).json({ error: "ต้องระบุ ruleId, from, to" });

      const timeframe = normalizeTimeframe(body.timeframe ?? deps.config.defaults.timeframe);
      const holdBars = clamp(parseNumber(body.holdBars, 5), 1, 260);
      const feeBps = clamp(parseNumber(body.feeBps, 10), 0, 200);

      const rule = await deps.rules.loadRule(ruleId);
      const { symbols } = await deps.symbols.loadSet100();

      let targetSymbols = symbols;
      if (typeof body.symbols === "string" && body.symbols.trim()) {
        const wanted = body.symbols
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);
        targetSymbols = symbols.filter((s) => wanted.includes(s));
      }

      const result = await runBacktest({
        rule,
        symbols: targetSymbols,
        timeframe,
        from,
        to,
        holdBars,
        feeBps,
        candlesRepo: deps.candlesRepo,
        yahoo: deps.yahoo
      });

      const outDir = path.join(projectRoot, "data", "backtests");
      await fs.mkdir(outDir, { recursive: true });
      const stamp = new Date().toISOString().replaceAll(":", "-");
      const base = `backtest_${ruleId}_${timeframe}_${from}_${to}_${stamp}`;
      const jsonFile = path.join(outDir, `${base}.json`);
      const csvFile = path.join(outDir, `${base}.csv`);

      await fs.writeFile(jsonFile, JSON.stringify(result, null, 2), "utf-8");
      await exportTradesCsv(csvFile, result.trades);

      return res.json({
        ...result,
        files: {
          json: path.relative(projectRoot, jsonFile).replaceAll("\\", "/"),
          csv: path.relative(projectRoot, csvFile).replaceAll("\\", "/")
        }
      });
    } catch (e) {
      return res.status(500).json({ error: String(e?.message ?? e) });
    }
  });

  return router;
}
