# Rules (กฎสแกน)

ไฟล์อยู่ที่ `data/rules/*.json`

## โครงสร้าง rule
ตัวอย่าง (RSI(5) <= 20):
```json
{
  "name": "RSI(5) Oversold (<=20)",
  "timeframe": "1D",
  "when": {
    "all": [
      {
        "op": "<=",
        "left": { "indicator": { "name": "RSI", "params": { "period": 5 } } },
        "right": { "value": 20 }
      }
    ]
  }
}
```

## ตัวดำเนินการ (op)
รองรับ: `<`, `<=`, `>`, `>=`, `==`, `!=`

## Expression (left/right)
- ค่าคงที่: `{ "value": 20 }`
- ราคา: `{ "price": "close" }` (open/high/low/close)
- indicator:
  - `{ "indicator": { "name": "RSI", "params": { "period": 5 } } }`
  - `{ "indicator": { "name": "MACD", "field": "hist", "params": { "fast":12,"slow":26,"signal":9 } } }`

## Indicators ที่รองรับ
- RSI, SMA, EMA, MACD, BB(Bollinger), ATR

