import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root is one level above /src
export const projectRoot = path.join(__dirname, "..");

export const config = {
  port: process.env.PORT ? Number(process.env.PORT) : 5173,
  publicDir: path.join(projectRoot, "public"),
  set100File: path.join(projectRoot, "data", "set100.json"),
  rulesDir: path.join(projectRoot, "data", "rules"),
  dbFile: path.join(projectRoot, "data", "app.db"),

  // Defaults (user can override via query)
  defaults: {
    period: 5,
    overbought: 80,
    oversold: 20,
    timeframe: "1D",
    concurrency: 8,
    cacheSeconds: 60,

    // Data layer cache: if we have candles newer than this, reuse instead of refetch
    dataTtlMinutes: 60
  }
};
