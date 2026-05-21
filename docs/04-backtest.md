# Backtest

## โมเดล (ค่าเริ่มต้น)
- Long-only
- เข้าเมื่อ rule match ที่แท่ง i → ซื้อที่แท่ง i+1 ราคา **Open**
- ออกแบบ “ถือคงที่ N แท่ง” → ขายที่แท่ง Exit ราคา **Close**
- มีค่าธรรมเนียม `feeBps` (basis points) ต่อ “ขา” (entry+exit)

## CLI
```bash
npm run backtest -- --ruleId rsi5_oversold --from 2025-01-01 --to 2025-06-30 --timeframe 1D --holdBars 5 --feeBps 10
```

ผลลัพธ์จะถูก export เป็น:
- `data/backtests/*.json`
- `data/backtests/*.csv`

## API
`POST /api/backtest/run`

ตัวอย่าง body:
```json
{
  "ruleId": "rsi5_oversold",
  "timeframe": "1D",
  "from": "2025-01-01",
  "to": "2025-06-30",
  "holdBars": 5,
  "feeBps": 10
}
```

