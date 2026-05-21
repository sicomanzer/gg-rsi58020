import fs from "fs/promises";
import path from "path";
import { config, projectRoot } from "../src/config.js";
import { openDb } from "../src/data/db.js";
import { createCandlesRepo } from "../src/data/candlesRepo.js";
import { SymbolsService } from "../src/services/symbols.js";
import { YahooService } from "../src/services/yahoo.js";
import { RulesService } from "../src/services/rules.js";
import { runBacktest } from "../src/backtest/backtest.js";
import { exportTradesCsv } from "../src/backtest/exportCsv.js";

function arg(name, fallback = null) {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

async function main() {
  const ruleId = arg("ruleId");
  const from = arg("from");
  const to = arg("to");
  const timeframe = arg("timeframe", "1D");
  const holdBars = Number(arg("holdBars", "5"));
  const feeBps = Number(arg("feeBps", "10"));
  const symbolsArg = arg("symbols", "");

  if (!ruleId || !from || !to) {
    console.log("Usage:");
    console.log("  node scripts/backtest.js --ruleId <id> --from YYYY-MM-DD --to YYYY-MM-DD [--timeframe 1D|1W] [--holdBars 5] [--feeBps 10] [--symbols AOT,ADVANC]");
    process.exitCode = 1;
    return;
  }

  const db = await openDb({ filename: config.dbFile });
  const candlesRepo = createCandlesRepo(db);
  const symbolsSvc = new SymbolsService({ set100File: config.set100File });
  const yahoo = new YahooService({ candlesRepo, defaults: { dataTtlMinutes: config.defaults.dataTtlMinutes } });
  const rules = new RulesService({ rulesDir: config.rulesDir });

  const rule = await rules.loadRule(ruleId);
  const { symbols } = await symbolsSvc.loadSet100();
  const pick = symbolsArg
    ? symbolsArg.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
    : symbols;
  const targetSymbols = symbolsArg ? symbols.filter((s) => pick.includes(s)) : symbols;

  const result = await runBacktest({
    rule,
    symbols: targetSymbols,
    timeframe,
    from,
    to,
    holdBars,
    feeBps,
    candlesRepo,
    yahoo
  });

  const outDir = path.join(projectRoot, "data", "backtests");
  await fs.mkdir(outDir, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "-");
  const base = `backtest_${ruleId}_${timeframe}_${from}_${to}_${stamp}`;

  const jsonPath = path.join(outDir, `${base}.json`);
  const csvPath = path.join(outDir, `${base}.csv`);
  await fs.writeFile(jsonPath, JSON.stringify(result, null, 2), "utf-8");
  await exportTradesCsv(csvPath, result.trades);

  console.log(`Trades: ${result.meta.tradesCount}`);
  console.log(`WinRate: ${(result.stats.winRate * 100).toFixed(2)}%`);
  console.log(`AvgReturn(trade): ${(result.stats.avgReturn * 100).toFixed(3)}%`);
  console.log(`MaxDrawdown: ${(result.stats.maxDrawdown * 100).toFixed(2)}%`);
  console.log(`EquityFinal: ${result.stats.equityFinal.toFixed(4)}`);
  console.log(`Saved:\n  ${jsonPath}\n  ${csvPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
