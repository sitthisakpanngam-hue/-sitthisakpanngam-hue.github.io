# ไร่หยด AI — เซิร์ฟเวอร์กลางเก็บคีย์ (Cloudflare Worker ฟรี)

ให้ทุกคนที่เข้าเว็บใช้ AI ด้วยคีย์ Gemini ของเจ้าของ โดยไม่มีใครเห็นคีย์

**ห้ามใส่คีย์ลงในไฟล์ใด ๆ ใน GitHub** ให้ใส่ใน Cloudflare เท่านั้น

## ขั้นตอน (ทำบนมือถือได้)
1. เข้า **dash.cloudflare.com** แล้วสมัครฟรี (ไม่ต้องใช้บัตร)
2. เมนู **Workers & Pages** → **Create** → **Create Worker** → ตั้งชื่อ เช่น `raidrop-ai` → **Deploy**
3. กด **Edit code** → ลบโค้ดเดิมทั้งหมด → วางโค้ดจากไฟล์ `raidrop-ai-worker.js` → **Deploy**
4. กลับไปที่ Worker → **Settings** → **Variables and Secrets** → **Add**
   - Type: **Secret**
   - Name: `GEMINI_KEY`
   - Value: คีย์ Gemini ของคุณ
   - กด **Deploy**
5. คัดลอกลิงก์ของ Worker (เช่น `https://raidrop-ai.xxxx.workers.dev`) ไปใส่ในค่า `AI_PROXY` ใน `index.html`
   - ลิงก์นี้ไม่ใช่ความลับ ใส่ใน GitHub ได้

## ปรับได้
- `PER_HOUR` (Variable ธรรมดา): จำนวนคำถามสูงสุดต่อคนต่อชั่วโมง ค่าเริ่มต้นคือ 20
- `ALLOW` ในโค้ด: เว็บที่อนุญาตให้เรียกใช้

## หมายเหตุ
โควตาฟรีของ Gemini ใช้ร่วมกันทุกคน ถ้าวันไหนหมด แอปจะสลับไปใช้ AI ฟรีตัวอื่นหรือคำตอบพื้นฐานให้เอง
