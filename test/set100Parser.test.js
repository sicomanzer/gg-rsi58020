import test from "node:test";
import assert from "node:assert/strict";
import { parseSet100FromText } from "../src/set100/parseSet100FromText.js";

test("parseSet100FromText extracts 100 symbols", () => {
  const lines = [];
  lines.push("SET100 / SET100FF Index Constituents");
  lines.push("");
  lines.push("No Symbol SET100 Company Sector");
  for (let i = 1; i <= 100; i++) {
    lines.push(`${i} T${i} TEST COMPANY Sector`);
  }
  const text = lines.join("\n");

  const syms = parseSet100FromText(text);
  assert.equal(syms.length, 100);
  assert.equal(syms[0], "T1");
  assert.equal(syms[99], "T100");
});

