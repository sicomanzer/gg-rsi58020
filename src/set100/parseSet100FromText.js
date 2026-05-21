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

  // Find the table header for SET100 (PDF layout can vary between periods)
  // Examples:
  // - "No Symbol SET100 Company Sector"
  // - "No Symbol Company Name Sector"
  // - "No Symbol Company Sector"
  const headerRe = /No\s+Symbol(?:\s+SET100)?\s+Company(?:\s+Name)?\s+Sector\s*\n\s*1\s+/i;
  const m = text.match(headerRe);
  if (!m || m.index == null) throw new Error("ไม่พบหัวตาราง SET100 ในข้อความ");

  let sub = text.slice(m.index);

  // Extract numbered rows
  // NOTE: ห้ามตัดด้วย stop markers เพราะบาง PDF มีการสลับลำดับข้อความตอน extract
  // ทำให้ตัดก่อนครบ 1..100 ได้ (เช่น header SET50 โผล่คั่นกลาง)
  const rowRe = /^\s*(\d{1,3})\s+([A-Z0-9]{1,8})\s+/gm;
  /** @type {Map<number,string>} */
  const byNo = new Map();
  let mRow;
  while ((mRow = rowRe.exec(sub)) !== null) {
    const no = Number(mRow[1]);
    const sym = mRow[2];
    if (Number.isFinite(no) && no >= 1 && no <= 100 && !byNo.has(no)) byNo.set(no, sym);
    if (byNo.size >= 100) break;
  }

  const missing = [];
  for (let i = 1; i <= 100; i++) if (!byNo.has(i)) missing.push(i);
  if (missing.length) {
    throw new Error(`ดึงรายชื่อ SET100 ไม่ครบ (missing: ${missing.slice(0, 10).join(",")}${missing.length > 10 ? "..." : ""})`);
  }

  return Array.from({ length: 100 }, (_, i) => byNo.get(i + 1));
}
