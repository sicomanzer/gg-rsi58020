import { atr, bollinger, ema, macd, rsiWilder, sma } from "../indicators/index.js";

/**
 * Build indicator key string for caching/visibility.
 * @param {string} name
 * @param {object} params
 * @param {string | undefined} field
 */
function makeKey(name, params, field) {
  const p = params && Object.keys(params).length ? JSON.stringify(params) : "";
  return `${name}${p ? `:${p}` : ""}${field ? `.${field}` : ""}`;
}

/**
 * @param {{ quotes: any[], closes: number[] }} series
 */
function createIndicatorResolver(series) {
  /** @type {Map<string, any>} */
  const cache = new Map();

  /**
   * @param {{ name: string, params?: any, field?: string }} req
   */
  function get(req) {
    const key = makeKey(req.name, req.params ?? {}, req.field);
    if (cache.has(key)) return { key, value: cache.get(key) };

    const name = String(req.name).toUpperCase();
    const params = req.params ?? {};

    let value = null;
    if (name === "RSI") value = rsiWilder(series.closes, Number(params.period ?? 14));
    else if (name === "SMA") value = sma(series.closes, Number(params.period ?? 20));
    else if (name === "EMA") value = ema(series.closes, Number(params.period ?? 20));
    else if (name === "MACD") value = macd(series.closes, params);
    else if (name === "BB" || name === "BOLLINGER") value = bollinger(series.closes, params);
    else if (name === "ATR") value = atr(series.quotes, Number(params.period ?? 14));
    else throw new Error(`ไม่รู้จัก indicator: ${req.name}`);

    // If indicator returns object and field specified, extract it
    if (value && typeof value === "object" && req.field) {
      value = value[req.field];
    }

    cache.set(key, value);
    return { key, value };
  }

  return { get, cache };
}

/**
 * Evaluate rule conditions.
 *
 * Rule format:
 * {
 *   "id": "rsi_oversold",
 *   "name": "...",
 *   "timeframe": "1D",
 *   "when": { "all": [ { "op": "<=", "left": {...}, "right": {...} } ] }
 * }
 *
 * Expr:
 * - { "value": 20 }
 * - { "price": "close" }  // close|open|high|low
 * - { "indicator": { "name":"RSI", "params":{"period":5} } }
 *   (optional) { "indicator": { "name":"MACD", "field":"hist", "params":{...} } }
 */
export function evaluateRule(rule, series) {
  const resolver = createIndicatorResolver(series);
  const last = series.quotes.at(-1) ?? null;

  function evalExpr(expr) {
    if (expr == null) return null;
    if (typeof expr === "number") return expr;
    if (typeof expr !== "object") return null;

    if (Object.prototype.hasOwnProperty.call(expr, "value")) return Number(expr.value);

    if (expr.price) {
      const f = String(expr.price).toLowerCase();
      return last && typeof last[f] === "number" ? last[f] : null;
    }

    if (expr.indicator) {
      const ind = expr.indicator;
      const { key, value } = resolver.get({
        name: ind.name,
        params: ind.params,
        field: ind.field
      });
      return value;
    }

    return null;
  }

  function compare(op, left, right) {
    if (typeof left !== "number" || typeof right !== "number") return false;
    if (op === "<") return left < right;
    if (op === "<=") return left <= right;
    if (op === ">") return left > right;
    if (op === ">=") return left >= right;
    if (op === "==") return left === right;
    if (op === "!=") return left !== right;
    throw new Error(`ไม่รองรับ operator: ${op}`);
  }

  function evalWhen(node) {
    if (!node || typeof node !== "object") return false;

    if (Array.isArray(node.all)) return node.all.every(evalWhen);
    if (Array.isArray(node.any)) return node.any.some(evalWhen);

    if (node.op) {
      const left = evalExpr(node.left);
      const right = evalExpr(node.right);
      return compare(String(node.op), left, right);
    }

    return false;
  }

  const matched = evalWhen(rule.when);

  const indicators = {};
  for (const [k, v] of resolver.cache.entries()) indicators[k] = v;

  return { matched, indicators };
}

