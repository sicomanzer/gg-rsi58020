/**
 * RSI (Wilder's smoothing) for the latest point.
 * @param {number[]} closes
 * @param {number} period
 * @returns {number} RSI value (0..100)
 */
export function rsiWilder(closes, period) {
  if (!Array.isArray(closes) || closes.length < period + 2) {
    throw new Error("closes ไม่พอสำหรับคำนวณ RSI");
  }

  // Initial average gain/loss over first `period` deltas
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) gainSum += delta;
    else lossSum += -delta;
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  // Wilder smoothing for the rest
  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return Math.round(rsi * 100) / 100;
}

