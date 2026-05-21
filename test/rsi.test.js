import test from "node:test";
import assert from "node:assert/strict";
import { rsiWilder } from "../src/indicators/rsi.js";

test("RSI(2) should be 100 for strictly increasing closes", () => {
  const closes = [1, 2, 3, 4];
  assert.equal(rsiWilder(closes, 2), 100);
});

test("RSI(2) should be 0 for strictly decreasing closes", () => {
  const closes = [4, 3, 2, 1];
  assert.equal(rsiWilder(closes, 2), 0);
});

test("RSI(2) sanity check on alternating series", () => {
  // With Wilder smoothing, this specific series yields RSI = 75
  const closes = [1, 2, 1, 2];
  assert.equal(rsiWilder(closes, 2), 75);
});
