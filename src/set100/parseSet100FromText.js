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

  // Find the table header for SET100
  const headerRe = /No\s+Symbol\s+SET100\s+Company\s+Sector\s*\n\s*1\s+/i;
  const m = text.match(headerRe);
  if (!m || m.index == null) throw new Error("ไม่พบหัวตาราง SET100 ในข้อความ");

  let sub = text.slice(m.index);

  // Try to stop at the next section markers to reduce false positives
  const stopMarkers = ["\nReserve List", "\nDisclaimer", "\nMore information", "\nSET50 /", "\nSETCLMV", "\nSETWB"];
  let stopIdx = sub.length;
  for (const marker of stopMarkers) {
    const i = sub.indexOf(marker);
    if (i >= 0 && i < stopIdx) stopIdx = i;
  }
  sub = sub.slice(0, stopIdx);

  // Extract numbered rows
  const rowRe = /^\s*(\d{1,3})\s+([A-Z0-9]{1,8})\s+/gm;
  /** @type {Map<number,string>} */
  const byNo = new Map();
  for (const match of sub.matchAll(rowRe)) {
    const no = Number(match[1]);
    const sym = match[2];
    if (Number.isFinite(no) && no >= 1 && no <= 100 && !byNo.has(no)) {
      byNo.set(no, sym);
    }
  }

  const missing = [];
  for (let i = 1; i <= 100; i++) if (!byNo.has(i)) missing.push(i);
  if (missing.length) {
    throw new Error(`ดึงรายชื่อ SET100 ไม่ครบ (missing: ${missing.slice(0, 10).join(",")}${missing.length > 10 ? "..." : ""})`);
  }

  return Array.from({ length: 100 }, (_, i) => byNo.get(i + 1));
}

