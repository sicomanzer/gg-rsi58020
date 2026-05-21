import { open } from "sqlite";
import sqlite3 from "sqlite3";

/**
 * @param {{ filename: string }} params
 */
export async function openDb(params) {
  const db = await open({
    filename: params.filename,
    driver: sqlite3.Database
  });

  await db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;

    CREATE TABLE IF NOT EXISTS candles (
      symbol TEXT NOT NULL,
      timeframe TEXT NOT NULL,          -- '1D' or '1W'
      date TEXT NOT NULL,               -- ISO string
      open REAL,
      high REAL,
      low REAL,
      close REAL,
      volume REAL,
      adjclose REAL,
      source TEXT NOT NULL,             -- 'yahoo'
      fetched_at TEXT NOT NULL,         -- ISO timestamp when inserted
      PRIMARY KEY (symbol, timeframe, date)
    );

    CREATE TABLE IF NOT EXISTS fetch_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      source TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT NOT NULL,
      ok INTEGER NOT NULL,
      error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_candles_symbol_tf_date ON candles(symbol, timeframe, date);
  `);

  return db;
}

