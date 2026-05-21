/**
 * @param {import("sqlite").Database} db
 */
export function createCandlesRepo(db) {
  return {
    /**
     * @param {{ symbol: string, timeframe: string }} params
     */
    async getLatestCandle(params) {
      return db.get(
        `SELECT * FROM candles WHERE symbol=? AND timeframe=? ORDER BY date DESC LIMIT 1`,
        params.symbol,
        params.timeframe
      );
    },

    /**
     * @param {{ symbol: string, timeframe: string, fromIso: string }} params
     */
    async getCandlesFrom(params) {
      return db.all(
        `SELECT * FROM candles WHERE symbol=? AND timeframe=? AND date>=? ORDER BY date ASC`,
        params.symbol,
        params.timeframe,
        params.fromIso
      );
    },

    /**
     * @param {{ symbol: string, timeframe: string, fromIso: string, toIso: string }} params
     */
    async getCandlesBetween(params) {
      return db.all(
        `SELECT * FROM candles WHERE symbol=? AND timeframe=? AND date>=? AND date<=? ORDER BY date ASC`,
        params.symbol,
        params.timeframe,
        params.fromIso,
        params.toIso
      );
    },

    /**
     * @param {{ symbol: string, timeframe: string, rows: any[], source: string }} params
     */
    async upsertCandles(params) {
      const now = new Date().toISOString();
      await db.exec("BEGIN");
      try {
        const stmt = await db.prepare(`
          INSERT INTO candles(symbol,timeframe,date,open,high,low,close,volume,adjclose,source,fetched_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?)
          ON CONFLICT(symbol,timeframe,date) DO UPDATE SET
            open=excluded.open,
            high=excluded.high,
            low=excluded.low,
            close=excluded.close,
            volume=excluded.volume,
            adjclose=excluded.adjclose,
            source=excluded.source,
            fetched_at=excluded.fetched_at
        `);

        for (const r of params.rows) {
          if (!r?.date) continue;
          const dateIso = new Date(r.date).toISOString();
          await stmt.run(
            params.symbol,
            params.timeframe,
            dateIso,
            r.open ?? null,
            r.high ?? null,
            r.low ?? null,
            r.close ?? null,
            r.volume ?? null,
            r.adjclose ?? r.adjClose ?? null,
            params.source,
            now
          );
        }
        await stmt.finalize();
        await db.exec("COMMIT");
      } catch (e) {
        await db.exec("ROLLBACK");
        throw e;
      }
    },

    /**
     * @param {{ symbol: string, timeframe: string, source: string, startedAt: string, finishedAt: string, ok: boolean, error?: string }} params
     */
    async addFetchLog(params) {
      await db.run(
        `INSERT INTO fetch_log(symbol,timeframe,source,started_at,finished_at,ok,error) VALUES(?,?,?,?,?,?,?)`,
        params.symbol,
        params.timeframe,
        params.source,
        params.startedAt,
        params.finishedAt,
        params.ok ? 1 : 0,
        params.error ?? null
      );
    },

    async getDbStats() {
      const candlesCount = await db.get(`SELECT COUNT(*) as n FROM candles`);
      const lastFetch = await db.get(`SELECT finished_at FROM fetch_log ORDER BY id DESC LIMIT 1`);
      return {
        candlesCount: candlesCount?.n ?? 0,
        lastFetchAt: lastFetch?.finished_at ?? null
      };
    }
  };
}
