import fs from "fs/promises";
import path from "path";
import { PDFParse } from "pdf-parse";
import { parseSet100FromText } from "./parseSet100FromText.js";
import { projectRoot } from "../config.js";

/**
 * @param {{
 *  url: string,
 *  outFile?: string,
 *  metaFile?: string,
 * }} params
 */
export async function updateSet100FromPdfUrl(params) {
  const url = String(params.url || "").trim();
  if (!url) throw new Error("ต้องระบุ url ของไฟล์ PDF");

  const outFile = params.outFile ?? path.join(projectRoot, "data", "set100.json");
  const metaFile = params.metaFile ?? path.join(projectRoot, "data", "set100.meta.json");

  const fetchedAt = new Date().toISOString();

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`ดาวน์โหลด PDF ไม่สำเร็จ: HTTP ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());

  const parser = new PDFParse({ data: buf });
  const parsed = await parser.getText();
  const text = parsed.text || "";
  await parser.destroy();

  const symbols = parseSet100FromText(text);

  await fs.writeFile(outFile, JSON.stringify(symbols, null, 2), "utf-8");
  await fs.writeFile(
    metaFile,
    JSON.stringify(
      {
        sourceUrl: url,
        fetchedAt,
        count: symbols.length
      },
      null,
      2
    ),
    "utf-8"
  );

  return { symbols, meta: { sourceUrl: url, fetchedAt, count: symbols.length } };
}
