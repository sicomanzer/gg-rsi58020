/**
 * Estimate minimum lookback candles needed for a rule.
 * @param {any} rule
 * @returns {number}
 */
export function estimateLookbackFromRule(rule) {
  let max = 30;

  function visitExpr(expr) {
    if (!expr || typeof expr !== "object") return;
    if (expr.indicator) {
      const ind = expr.indicator;
      const name = String(ind.name || "").toUpperCase();
      const p = ind.params || {};
      if (name === "RSI" || name === "SMA" || name === "EMA" || name === "ATR") {
        const period = Number(p.period ?? 14);
        if (Number.isFinite(period)) max = Math.max(max, period);
      } else if (name === "BB" || name === "BOLLINGER") {
        const period = Number(p.period ?? 20);
        if (Number.isFinite(period)) max = Math.max(max, period);
      } else if (name === "MACD") {
        const slow = Number(p.slow ?? 26);
        const signal = Number(p.signal ?? 9);
        const need = Number.isFinite(slow) && Number.isFinite(signal) ? slow + signal : 35;
        max = Math.max(max, need);
      }
    }
  }

  function visitWhen(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node.all)) node.all.forEach(visitWhen);
    if (Array.isArray(node.any)) node.any.forEach(visitWhen);
    if (node.left) visitExpr(node.left);
    if (node.right) visitExpr(node.right);
  }

  visitWhen(rule?.when);
  return max;
}

