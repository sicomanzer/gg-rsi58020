# Contributing

ขอบคุณที่สนใจช่วยพัฒนาโปรเจกต์นี้

## แนวทางการส่ง PR
1) เปิด Issue อธิบายปัญหา/ฟีเจอร์ (ถ้าเป็นงานใหญ่)
2) Fork / สร้าง branch ใหม่
3) รันชุดทดสอบให้ผ่านก่อนส่ง:
```bash
npm test
```
4) PR ควรมี:
- คำอธิบายสั้น ๆ ว่าแก้อะไร/ทำไม
- วิธีทดสอบ (ถ้ามี)
- หากเปลี่ยน API/พฤติกรรม ให้เพิ่มบันทึกใน `CHANGELOG.md`

## โครงสร้างโปรเจกต์ (ย่อ)
- `src/services/` : ดึงข้อมูล/จัดการแหล่งข้อมูล (Yahoo + cache sqlite)
- `src/indicators/` : อินดิเคเตอร์แบบโมดูล
- `src/scanner/` : rule engine / scanners
- `src/backtest/` : backtest engine
- `data/` : set100.json, rules, app.db, backtests

