import test from "node:test";
import assert from "node:assert/strict";
import { evaluateRule } from "../src/scanner/ruleEngine.js";

test("ruleEngine: RSI oversold matches on downtrend", () => {
  const rule = {
    name: "RSI(2) <= 20",
    when: {
      all: [
        {
          op: "<=",
          left: { indicator: { name: "RSI", params: { period: 2 } } },
          right: { value: 20 }
        }
      ]
    }
  };

  const quotes = [
    { date: new Date("2025-01-01"), close: 3 },
    { date: new Date("2025-01-02"), close: 2 },
    { date: new Date("2025-01-03"), close: 1 },
    { date: new Date("2025-01-04"), close: 0.5 }
  ];
  const closes = quotes.map((q) => q.close);

  const out = evaluateRule(rule, { quotes, closes });
  assert.equal(out.matched, true);
  assert.ok(typeof out.indicators['RSI:{"period":2}'] === "number");
});
