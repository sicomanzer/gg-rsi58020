import fs from "fs/promises";

function csvEscape(v) {
  if (v == null) return "";
  const s = String(v);
  if (/[,"\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

/**
 * @param {string} filePath
 * @param {any[]} rows
 */
export async function exportTradesCsv(filePath, rows) {
  const headers = [
    "symbol",
    "timeframe",
    "entryDate",
    "exitDate",
    "entryPrice",
    "exitPrice",
    "grossReturn",
    "netReturn",
    "holdBars",
    "feeBps"
  ];

  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => csvEscape(r[h])).join(","));
  }

  await fs.writeFile(filePath, lines.join("\n"), "utf-8");
}

