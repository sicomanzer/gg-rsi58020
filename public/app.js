const $ = (id) => document.getElementById(id);

const form = $("form");
const modeEl = $("mode");
const timeframeEl = $("timeframe");
const ruleWrap = $("ruleWrap");
const ruleIdEl = $("ruleId");
const matchedOnlyWrap = $("matchedOnlyWrap");
const matchedOnlyEl = $("matchedOnly");
const fromWrap = $("fromWrap");
const toWrap = $("toWrap");
const holdBarsWrap = $("holdBarsWrap");
const feeBpsWrap = $("feeBpsWrap");
const fromEl = $("from");
const toEl = $("to");
const holdBarsEl = $("holdBars");
const feeBpsEl = $("feeBps");
const periodEl = $("period");
const overboughtEl = $("overbought");
const oversoldEl = $("oversold");
const minYieldWrap = $("minYieldWrap");
const minYieldEl = $("minYield");
const filterEl = $("filter");
const scanBtn = $("scanBtn");
const statusEl = $("status");
const updatedEl = $("updated");
const tbody = $("tbody");
const theadRow = $("theadRow");
const provEl = $("prov");
const setPdfUrlEl = $("setPdfUrl");
const updateSet100Btn = $("updateSet100Btn");

let lastRows = [];

function setModeUI() {
  const mode = modeEl.value;
  const isRule = mode === "rule";
  const isBacktest = mode === "backtest";
  ruleWrap.style.display = isRule || isBacktest ? "" : "none";
  matchedOnlyWrap.style.display = isRule ? "" : "none";
  fromWrap.style.display = isBacktest ? "" : "none";
  toWrap.style.display = isBacktest ? "" : "none";
  holdBarsWrap.style.display = isBacktest ? "" : "none";
  feeBpsWrap.style.display = isBacktest ? "" : "none";
  minYieldWrap.style.display = isBacktest ? "none" : "";

  // RSI scanner controls
  overboughtEl.disabled = isRule || isBacktest;
  oversoldEl.disabled = isRule || isBacktest;
  filterEl.disabled = isRule || isBacktest; // backtest has its own table
  periodEl.disabled = false; // used as lookback hint for rule, and as helper for scan

  // Table header
  if (isBacktest) {
    theadRow.innerHTML = `
      <th>Symbol</th>
      <th>Entry Date</th>
      <th>Entry</th>
      <th>Exit Date</th>
      <th>Exit</th>
      <th>Net %</th>
    `;
  } else if (isRule) {
    theadRow.innerHTML = `
      <th>Symbol</th>
      <th>Action</th>
      <th>Matched</th>
      <th>Indicators</th>
      <th>Close</th>
      <th>Yield%</th>
      <th>Date</th>
      <th>Error</th>
    `;
  } else {
    theadRow.innerHTML = `
      <th>Symbol</th>
      <th>Action</th>
      <th>RSI</th>
      <th>Signal</th>
      <th>Close</th>
      <th>Yield%</th>
      <th>Date</th>
      <th>Error</th>
    `;
  }
}

function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleString("th-TH", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function fmtNum(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  return n.toFixed(2);
}

function pill(signal) {
  const cls = ["pill", signal].join(" ");
  const label =
    signal === "overbought" ? "Overbought" : signal === "oversold" ? "Oversold" : signal === "neutral" ? "Neutral" : "Error";
  return `<span class="${cls}">${label}</span>`;
}

function actionIcon(action) {
  const a = String(action || "").toLowerCase();
  if (a === "buy") {
    return `<span class="action buy" title="ซื้อ" aria-label="ซื้อ">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 4l7 7h-4v9H9v-9H5l7-7z" fill="currentColor"/>
      </svg>
    </span>`;
  }
  if (a === "sell") {
    return `<span class="action sell" title="ขาย" aria-label="ขาย">
      <svg viewBox="0 0 24 24" fill="none">
        <path d="M12 20l-7-7h4V4h6v9h4l-7 7z" fill="currentColor"/>
      </svg>
    </span>`;
  }
  return `<span class="action hold" title="ถือ" aria-label="ถือ">
    <svg viewBox="0 0 24 24" fill="none">
      <path d="M7 6h4v12H7V6zm6 0h4v12h-4V6z" fill="currentColor"/>
    </svg>
  </span>`;
}

function actionForRow(mode, r) {
  if (r?.error) return "";
  if (mode === "rule") return r?.matched ? "buy" : "hold";
  if (mode === "backtest") return ""; // มี entry/exit อยู่แล้ว
  // RSI mode
  if (r?.signal === "oversold") return "buy";
  if (r?.signal === "overbought") return "sell";
  return "hold";
}

function pillMatch(matched) {
  const cls = ["pill", matched ? "oversold" : "neutral"].join(" ");
  return `<span class="${cls}">${matched ? "Matched" : "Not matched"}</span>`;
}

function formatIndicators(indicators) {
  if (!indicators || typeof indicators !== "object") return "";
  const parts = [];
  for (const [k, v] of Object.entries(indicators)) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    // k example: RSI:{"period":5}
    const name = k.split(":")[0];
    let paramText = "";
    const m = k.match(/\{.*\}/);
    if (m) {
      try {
        const p = JSON.parse(m[0]);
        if (p?.period) paramText = `(${p.period})`;
        else if (name === "MACD") paramText = `(${p.fast ?? 12},${p.slow ?? 26},${p.signal ?? 9})`;
      } catch {
        // ignore
      }
    }
    parts.push(`${name}${paramText}=${fmtNum(v)}`);
    if (parts.length >= 3) break; // keep UI compact
  }
  return parts.join(", ");
}

function renderRows(rows) {
  lastRows = rows;
  const mode = modeEl.value;
  const filter = filterEl.value;
  const colspan = mode === "backtest" ? 6 : 8;
  const filtered = rows.filter((r) => {
    if (mode === "rule") return true;
    if (mode === "backtest") return true;
    if (filter === "all") return true;
    if (filter === "error") return !!r.error;
    return r.signal === filter && !r.error;
  });

  // Sort: errors last, otherwise RSI ascending (or matched first for rules)
  filtered.sort((a, b) => {
    if (a.error && !b.error) return 1;
    if (!a.error && b.error) return -1;
    if (mode === "rule") {
      if (a.matched && !b.matched) return -1;
      if (!a.matched && b.matched) return 1;
      return a.symbol.localeCompare(b.symbol);
    } else if (mode === "backtest") {
      return new Date(a.exitDate) - new Date(b.exitDate);
    } else {
      const ar = typeof a.rsi === "number" ? a.rsi : 9999;
      const br = typeof b.rsi === "number" ? b.rsi : 9999;
      return ar - br;
    }
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${colspan}" class="muted">ไม่มีข้อมูลตามตัวกรอง</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .map((r) => {
      const close = r.error ? "" : fmtNum(r.close);
      const date = r.error ? "" : fmtDate(r.date);
      const err = r.error ? `<span class="muted">${r.error}</span>` : "";

      if (mode === "rule") {
        const ind = formatIndicators(r.indicators);
        const match = r.error ? pill("error") : pillMatch(!!r.matched);
        const act = r.error ? "" : actionIcon(actionForRow(mode, r));
        const y = r.error ? "" : fmtNum(r.yieldPercent);
        return `<tr>
          <td><strong>${r.symbol}</strong></td>
          <td>${act}</td>
          <td>${match}</td>
          <td class="muted">${ind}</td>
          <td>${close}</td>
          <td>${y}</td>
          <td>${date}</td>
          <td>${err}</td>
        </tr>`;
      }

      if (mode === "backtest") {
        const netPct = typeof r.netReturn === "number" ? (r.netReturn * 100).toFixed(2) : "";
        return `<tr>
          <td><strong>${r.symbol}</strong></td>
          <td>${fmtDate(r.entryDate)}</td>
          <td>${fmtNum(r.entryPrice)}</td>
          <td>${fmtDate(r.exitDate)}</td>
          <td>${fmtNum(r.exitPrice)}</td>
          <td>${netPct}</td>
        </tr>`;
      }

      const rsi = r.error ? "" : fmtNum(r.rsi);
      const sig = r.error ? pill("error") : pill(r.signal);
      const act = r.error ? "" : actionIcon(actionForRow(mode, r));
      const y = r.error ? "" : fmtNum(r.yieldPercent);
      return `<tr>
          <td><strong>${r.symbol}</strong></td>
          <td>${act}</td>
          <td>${rsi}</td>
          <td>${sig}</td>
          <td>${close}</td>
          <td>${y}</td>
          <td>${date}</td>
          <td>${err}</td>
        </tr>`;
    })
    .join("");
}

async function scan() {
  const mode = modeEl.value;
  const timeframe = String(timeframeEl.value || "1D");
  const period = Number(periodEl.value || 5);
  const overbought = Number(overboughtEl.value || 80);
  const oversold = Number(oversoldEl.value || 20);
  const minYield = Number(minYieldEl.value || 0);

  let url = "/api/scan";
  const qs = new URLSearchParams({ timeframe });

  if (mode === "backtest") {
    statusEl.textContent = "กำลังรัน backtest… (อาจใช้เวลาสักครู่)";
    updatedEl.textContent = "";
    scanBtn.disabled = true;
    try {
      const payload = {
        ruleId: String(ruleIdEl.value || ""),
        timeframe,
        from: String(fromEl.value || "").trim(),
        to: String(toEl.value || "").trim(),
        holdBars: Number(holdBarsEl.value || 5),
        feeBps: Number(feeBpsEl.value || 10)
      };
      const resp = await fetch("/api/backtest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      renderRows(json.trades || []);
      const wr = (Number(json.stats?.winRate ?? 0) * 100).toFixed(2);
      const mdd = (Number(json.stats?.maxDrawdown ?? 0) * 100).toFixed(2);
      statusEl.textContent = `Backtest เสร็จแล้ว: trades=${json.meta?.tradesCount ?? 0}, winRate=${wr}%, maxDD=${mdd}%`;
      if (json.files?.csv) updatedEl.textContent = `Export: ${json.files.csv}`;
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="6" class="muted">เกิดข้อผิดพลาด: ${String(e?.message ?? e)}</td></tr>`;
      statusEl.textContent = "เกิดข้อผิดพลาด";
    } finally {
      scanBtn.disabled = false;
    }
    return;
  }

  if (mode === "rule") {
    url = "/api/scan/rule";
    qs.set("ruleId", String(ruleIdEl.value || ""));
    qs.set("matchedOnly", String(matchedOnlyEl.value || "false"));
    qs.set("period", String(period)); // เป็น hint/lookback (ระบบจะขยายเองถ้ากฎต้องใช้มากกว่า)
  } else {
    qs.set("period", String(period));
    qs.set("overbought", String(overbought));
    qs.set("oversold", String(oversold));
  }

  if (minYield > 0) qs.set("minYieldPercent", String(minYield));

  scanBtn.disabled = true;
  statusEl.textContent = "กำลังดึงข้อมูลและคำนวณ RSI… (อาจใช้เวลาสักครู่)";
  updatedEl.textContent = "";

  try {
    const resp = await fetch(`${url}?${qs.toString()}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    renderRows(json.data || []);
    statusEl.textContent = `สแกนเสร็จแล้ว (${json.meta?.symbolsCount ?? (json.data || []).length} ตัว)`;
    if (json.meta?.generatedAt) {
      const dt = new Date(json.meta.generatedAt);
      updatedEl.textContent = `อัปเดต: ${dt.toLocaleString("th-TH")}`;
    }
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" class="muted">เกิดข้อผิดพลาด: ${String(e?.message ?? e)}</td></tr>`;
    statusEl.textContent = "เกิดข้อผิดพลาด";
  } finally {
    scanBtn.disabled = false;
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  scan();
});

filterEl.addEventListener("change", () => {
  renderRows(lastRows);
});

modeEl.addEventListener("change", () => {
  setModeUI();
  renderRows(lastRows);
});

async function loadRules() {
  try {
    const resp = await fetch("/api/rules");
    const json = await resp.json();
    const rules = json.data || [];
    ruleIdEl.innerHTML = rules
      .map((r) => `<option value="${r.id}">${r.name}</option>`)
      .join("");
    if (!ruleIdEl.value && rules.length) ruleIdEl.value = rules[0].id;
  } catch {
    ruleIdEl.innerHTML = `<option value="">(โหลด rule ไม่สำเร็จ)</option>`;
  }
}

async function loadProvenance() {
  try {
    const resp = await fetch("/api/provenance");
    const json = await resp.json();
    const lastFetch = json?.db?.lastFetchAt ? new Date(json.db.lastFetchAt).toLocaleString("th-TH") : "-";
    provEl.innerHTML = `
      <div>Source: <strong>${json?.meta?.source ?? "-"}</strong></div>
      <div>DB cached candles: <strong>${json?.db?.candlesCount ?? 0}</strong> แถว</div>
      <div>Last fetch: <strong>${lastFetch}</strong></div>
    `;
  } catch (e) {
    provEl.textContent = `โหลด provenance ไม่สำเร็จ: ${String(e?.message ?? e)}`;
  }
}

async function updateSet100() {
  updateSet100Btn.disabled = true;
  const url = String(setPdfUrlEl.value || "").trim();
  try {
    const resp = await fetch("/api/set100/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(url ? { url } : {})
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json?.error || `HTTP ${resp.status}`);
    statusEl.textContent = `อัปเดต SET100 สำเร็จ (${json.meta?.count ?? (json.symbols || []).length} ตัว)`;
    await loadProvenance();
  } catch (e) {
    statusEl.textContent = `อัปเดต SET100 ไม่สำเร็จ: ${String(e?.message ?? e)}`;
  } finally {
    updateSet100Btn.disabled = false;
  }
}

setModeUI();
loadRules();
loadProvenance();

updateSet100Btn.addEventListener("click", updateSet100);

// Set sensible defaults for backtest date range if empty
if (!fromEl.value || !toEl.value) {
  const today = new Date();
  const to = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const from = new Date(to);
  from.setMonth(from.getMonth() - 6);
  const fmt = (d) => d.toISOString().slice(0, 10);
  fromEl.value = fmt(from);
  toEl.value = fmt(to);
}
