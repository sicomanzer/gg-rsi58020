import test from "node:test";
import assert from "node:assert/strict";
import { normalizeTimeframe, toYahooInterval, toYahooSymbol } from "../src/utils/timeframe.js";

test("normalizeTimeframe", () => {
  assert.equal(normalizeTimeframe("1d"), "1D");
  assert.equal(normalizeTimeframe("1W"), "1W");
  assert.equal(normalizeTimeframe("week"), "1W");
  assert.equal(normalizeTimeframe("x"), "1D");
});

test("toYahooInterval", () => {
  assert.equal(toYahooInterval("1D"), "1d");
  assert.equal(toYahooInterval("1W"), "1wk");
});

test("toYahooSymbol", () => {
  assert.equal(toYahooSymbol("aot"), "AOT.BK");
});

