/**
 * Parse SET100 symbols from extracted PDF text.
 * Designed to work with text like:
 * "No Symbol SET100 Company Sector\n1 AAV ...\n2 ADVANC ...\n..."
 *
 * @param {string} text
 * @returns {string[]} exactly 100 symbols (throws if cannot)
 */
export function parseSet100FromText(text) {
  if (typeof text !== "string" || !text.trim()) throw new Error("ไม่มีข้อความให้ parse");

  // PDF เดียวมักมีหลายตาราง (SET50/SET100/Reserve list) และการ extract ข้อความ
  // อาจสลับลำดับหน้า ทำให้ใช้ "header + 1" แบบตรง ๆ ไม่เสถียร
  // ดังนั้นใช้วิธี robust: หา "จุดเริ่มของตารางที่มีลำดับ 1..100 ครบ" จากทั้งเอกสาร

  const rowRe = /^\s*(\d{1,3})\s+([A-Z0-9]{1,8})\s+/gm;

  /** @type {{ idx: number, no: number, sym: string }[]} */
  const rows = [];
  for (const m of text.matchAll(rowRe)) {
    const no = Number(m[1]);
    if (!Number.isFinite(no) || no < 1 || no > 100) continue;
    rows.push({ idx: m.index ?? 0, no, sym: m[2] });
  }
  if (!rows.length) throw new Error("ไม่พบแถวข้อมูลลำดับ 1..100 ในข้อความ");

  // candidate starts = แถวที่ no=1
  const starts = rows.map((r, i) => (r.no === 1 ? i : -1)).filter((i) => i >= 0);
  if (!starts.length) throw new Error("ไม่พบจุดเริ่มตาราง (ลำดับ 1) ในข้อความ");

  const sectionRe = /SET100\s*\/\s*SET100FF\s+Index\s+Constituents/i;

  /** @type {null | { symbols: string[], score: number }} */
  let best = null;

  for (const startIdx of starts) {
    /** @type {Map<number,string>} */
    const byNo = new Map();
    for (let i = startIdx; i < rows.length; i++) {
      const r = rows[i];
      if (!byNo.has(r.no)) byNo.set(r.no, r.sym);
      if (byNo.size >= 100) break;
    }
    if (byNo.size !== 100) continue;

    const symbols = Array.from({ length: 100 }, (_, i) => byNo.get(i + 1));
    const uniq = new Set(symbols);
    if (uniq.size !== 100) continue;

    // scoring: prefer the one with SET100 section nearby (ถ้ามีในข้อความบริเวณใกล้เคียง)
    const startChar = rows[startIdx].idx;
    const window = text.slice(Math.max(0, startChar - 800), Math.min(text.length, startChar + 800));
    const score = sectionRe.test(window) ? 10 : 0;

    if (!best || score > best.score) best = { symbols, score };
    if (best && best.score >= 10) break; // good enough
  }

  if (!best) {
    throw new Error("ดึงรายชื่อ SET100 ไม่สำเร็จ (อาจเป็นเพราะข้อความใน PDF ถูก extract แบบสลับลำดับมากเกินไป)");
  }

  return best.symbols;
}
