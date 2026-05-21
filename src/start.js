import { config } from "./config.js";
import { createApp } from "./app.js";
import { SymbolsService } from "./services/symbols.js";
import { YahooService } from "./services/yahoo.js";
import { RulesService } from "./services/rules.js";
import { openDb } from "./data/db.js";
import { createCandlesRepo } from "./data/candlesRepo.js";

export function start() {
  (async () => {
    const db = await openDb({ filename: config.dbFile });
    const candlesRepo = createCandlesRepo(db);

    const symbols = new SymbolsService({ set100File: config.set100File });
    const yahoo = new YahooService({ candlesRepo, defaults: { dataTtlMinutes: config.defaults.dataTtlMinutes } });
    const rules = new RulesService({ rulesDir: config.rulesDir });

    const app = createApp({ config, symbols, yahoo, rules, candlesRepo });

    app.listen(config.port, () => {
      // eslint-disable-next-line no-console
      console.log(`SET100 RSI Scanner running: http://localhost:${config.port}/`);
    });
  })().catch((e) => {
    // eslint-disable-next-line no-console
    console.error("Failed to start server:", e);
    process.exitCode = 1;
  });
}
