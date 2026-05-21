import express from "express";
import path from "path";
import { createApiRouter } from "./routes/api.js";

/**
 * @param {{
 *  config: import("./config.js").config,
 *  symbols: import("./services/symbols.js").SymbolsService,
 *  yahoo: import("./services/yahoo.js").YahooService,
 * }} deps
 */
export function createApp(deps) {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use(express.static(deps.config.publicDir));
  app.use("/api", createApiRouter(deps));

  // SPA fallback
  app.get("*", (_req, res) => {
    res.sendFile(path.join(deps.config.publicDir, "index.html"));
  });

  return app;
}
