# Architecture

## โครงสร้างโฟลเดอร์
- `public/` หน้าเว็บ (Vanilla JS)
- `src/`
  - `app.js` ประกอบ Express app
  - `routes/api.js` API ทั้งหมด
  - `services/` การเข้าถึงข้อมูล/ไฟล์/กฎ
  - `data/` SQLite + repository
  - `indicators/` อินดิเคเตอร์แบบโมดูล
  - `scanner/` rule engine / scanners
  - `backtest/` backtest engine + export
- `data/`
  - `set100.json` รายชื่อหุ้น
  - `rules/` กฎสแกน
  - `app.db` SQLite cache
  - `backtests/` ผลลัพธ์ backtest

## Data Flow (ย่อ)
1) UI เรียก API (`/api/scan`, `/api/scan/rule`, `/api/backtest/run`)
2) API เรียก `YahooService` เพื่อดึง chart
3) `YahooService` จะ **cache ลง SQLite** (candles) และใช้ TTL ลดการยิงซ้ำ
4) scanner/backtest ใช้ข้อมูลในรูปแบบ `quotes[]` + `closes[]`

