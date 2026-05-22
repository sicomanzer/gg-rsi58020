# SET100 RSI Scanner (Localhost)

เว็บสแกนหุ้นใน **SET100** ด้วย **RSI (Wilder)** โดยปรับได้:
- Overbought (ค่าเริ่มต้น 80)
- Oversold (ค่าเริ่มต้น 20)
- Period (ค่าเริ่มต้น 5)
และมี **Rule Scanner** ที่นิยามกฎเป็นไฟล์ JSON เพื่อส่งต่อ/ขยายระบบได้ง่าย

## แหล่งข้อมูล (เพื่อความ “ข้อมูลจริง”)
- **ราคาหุ้น:** ดึงข้อมูลราคาย้อนหลังรายวันจาก **Yahoo Finance** (ใช้สำหรับคำนวณ RSI)
- **รายชื่อ SET100:** อยู่ในไฟล์ `data/set100.json` (แก้ไขได้)
  - ไฟล์เริ่มต้นที่ใส่มาให้ “ตั้งต้น” จากเอกสาร SET:  
    https://media.set.or.th/set/Documents/2025/Feb/SET50_100_H1_2025_revise.pdf  
    (SET100 / SET100FF Index Constituents: สำหรับช่วง Jan 1 – Jun 30, 2025)

> หมายเหตุ: ถ้าต้องการความแม่นยำ 100% แบบทางการ “ทุกช่วงเวลา” แนะนำให้อัปเดตรายชื่อ `data/set100.json` ตามประกาศล่าสุดของ SET เป็นระยะ

---

## วิธีรัน (Local)
1) ติดตั้ง Node.js (แนะนำ 18+)
2) เปิด Terminal ในโฟลเดอร์นี้ แล้วรัน:

```bash
npm install
npm start
```

3) เปิดเว็บ:
```
http://localhost:5173
```

## เอกสารเพิ่มเติม
- `docs/01-overview.md`
- `docs/02-architecture.md`
- `docs/03-rules.md`
- `docs/04-backtest.md`

## การอัปเดตรายชื่อหุ้น SET100
แก้ไขไฟล์:
- `data/set100.json`

รูปแบบคือ array ของ symbol เช่น:
```json
["ADVANC","AOT","CPALL"]
```

### อัปเดตอัตโนมัติจาก PDF ของ SET
มีสคริปต์ดึงรายชื่อ SET100 จากไฟล์ PDF ประกาศทางการของ SET (แบบเดียวกับที่เราอ้างอิงใน README นี้)

รัน:
```bash
npm run update:set100
```

หรือระบุ URL เอง:
```bash
node scripts/update-set100.js --url https://media.set.or.th/.../SET50_100_....pdf
```

บนหน้าเว็บก็สามารถกด “อัปเดตรายชื่อ SET100” ได้ (ส่วน Data Provenance)

## API (ถ้าต้องการเรียกเอง)
`GET /api/scan?period=5&overbought=80&oversold=20`

ตัวเลือกเสริม:
- `timeframe=1D` หรือ `timeframe=1W` (ค่าเริ่มต้น 1D)
- `includeYield=true|false` (ค่าเริ่มต้น true) ให้ดึง Dividend Yield% จาก Yahoo เพิ่มเติม
- `minYieldPercent=3` (ค่าเริ่มต้น 0) ตัวกรองเงินปันผลขั้นต่ำ (%). ถ้าตั้งค่านี้ ระบบจะบังคับ includeYield=true อัตโนมัติ
- `concurrency` (default 8) จำกัดจำนวนการดึงข้อมูลพร้อมกัน
- `cacheSeconds` (default 60) แคชผลลัพธ์เพื่อลดการยิง upstream
- `symbols=ADVANC,AOT,CPALL` สแกนเฉพาะบางตัว (คั่นด้วย comma)
- `limitN=10` สแกนแค่ N ตัวแรกในไฟล์ (เหมาะสำหรับทดสอบเร็ว)

## Rule Scanner
รายการ rule อยู่ใน `data/rules/*.json`

ดูรายการ rule:
- `GET /api/rules`

สแกนด้วย rule:
- `GET /api/scan/rule?ruleId=rsi5_oversold&timeframe=1D`

ตัวเลือกเสริม:
- `includeYield=true|false` (ค่าเริ่มต้น true)
- `minYieldPercent=3` (ค่าเริ่มต้น 0)
- `matchedOnly=true` ให้ส่งกลับเฉพาะตัวที่เข้าเงื่อนไข
- `period` เป็น “hint” ของ lookback (ระบบจะขยายเองถ้า rule ต้องใช้มากกว่า เช่น EMA(200))

## Data Layer (SQLite)
ระบบจะสร้างฐานข้อมูล SQLite ที่:
- `data/app.db`

ใช้เพื่อ “แคชแท่งราคา” ลดการยิงข้อมูลซ้ำ และรองรับการทำ backtest

ดูสถานะ/ความเป็นมาของข้อมูล (Provenance):
- `GET /api/provenance`

## SET100 Updater API
อัปเดตรายชื่อ SET100 จาก PDF (ค่าเริ่มต้นเป็น URL ที่ตั้งไว้ในโค้ด):
- `POST /api/set100/update`
  - body (optional): `{ "url": "https://media.set.or.th/.../something.pdf" }`

## Backtest (CLI)
รัน backtest ด้วย rule (เข้าเมื่อ match, ออกแบบ “ถือคงที่ N แท่ง”):

```bash
node scripts/backtest.js --ruleId rsi5_oversold --from 2025-01-01 --to 2025-06-30 --timeframe 1D --holdBars 5
```

ระบบจะ export ไฟล์ผลลัพธ์ไว้ที่:
- `data/backtests/*.json` (สรุป + trades)
- `data/backtests/*.csv` (รายการเทรด เปิดใน Excel ได้)
