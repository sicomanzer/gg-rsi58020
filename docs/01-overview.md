# ภาพรวมระบบ

โปรเจกต์นี้คือ “เว็บสแกนหุ้น SET100” ที่ออกแบบให้ **ส่งต่อ/ขยายต่อได้ง่าย** โดยมี 3 โหมดหลัก:

1) **RSI Scanner**  
คำนวณ RSI จากราคา (1D/1W) แล้วจัดกลุ่ม Overbought/Oversold ตามค่าที่ตั้ง

2) **Rule Scanner**  
นิยามกฎเป็นไฟล์ JSON (`data/rules/*.json`) แล้วสแกนว่าหุ้นตัวไหนเข้าเงื่อนไข

3) **Backtest**  
ทดสอบกฎย้อนหลังแบบง่าย (Long-only): เข้าเมื่อ rule match, ออกแบบ “ถือคงที่ N แท่ง”  
พร้อม export รายการเทรดเป็น CSV/JSON

## หลักการออกแบบ (เพื่อส่งต่อ)
- แยกชั้น: UI / API / Services / Indicators / Backtest
- ทุกอย่างเป็น “ไฟล์ + สัญญา” ที่อ่านรู้เรื่อง (rules, outputs, docs)
- ใช้ SQLite เป็น data layer เพื่อ cache และทำสถิติ/backtest ได้

