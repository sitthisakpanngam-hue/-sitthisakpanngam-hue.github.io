// ไร่หยด AI proxy — Cloudflare Worker
// เก็บคีย์ Gemini ไว้ที่นี่ (เป็น Secret ชื่อ GEMINI_KEY) คนใช้เว็บจะไม่เห็นคีย์
// ห้ามวางคีย์ลงในโค้ดนี้โดยตรง ให้ใส่ใน Settings → Variables and Secrets เท่านั้น
const ALLOW = ['https://sitthisakpanngam-hue.github.io'];          // เว็บที่อนุญาตให้เรียกใช้
const MODELS = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest'];
const hits = new Map();                                            // นับจำนวนครั้งต่อ IP (คร่าว ๆ ต่อเครื่องเซิร์ฟเวอร์)

const json = (o, s, h) => new Response(JSON.stringify(o), { status: s, headers: { ...h, 'content-type': 'application/json; charset=utf-8' } });

export default {
  async fetch(req, env) {
    const origin = req.headers.get('origin') || '';
    const ok = ALLOW.includes(origin);
    const cors = { 'access-control-allow-origin': ok ? origin : ALLOW[0], 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'origin' };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST' || !ok) return json({ error: 'forbidden' }, 403, cors);
    if (!env.GEMINI_KEY) return json({ error: 'ยังไม่ได้ใส่ GEMINI_KEY ใน Worker' }, 500, cors);

    // จำกัดจำนวนครั้งต่อคน กันคนใช้เกินจนโควตาหมด (ปรับได้ด้วยตัวแปร PER_HOUR)
    const ip = req.headers.get('cf-connecting-ip') || '?', now = Date.now(), lim = +env.PER_HOUR || 20;
    const h = (hits.get(ip) || []).filter(t => now - t < 3600e3);
    if (h.length >= lim) return json({ error: 'ถามเยอะเกินไปในชั่วโมงนี้ รอสักครู่' }, 429, cors);
    h.push(now); hits.set(ip, h);
    if (hits.size > 5000) hits.clear();

    const raw = await req.text();
    if (raw.length > 2_500_000) return json({ error: 'ข้อมูลใหญ่เกินไป' }, 413, cors);
    let b; try { b = JSON.parse(raw); } catch (e) { return json({ error: 'bad json' }, 400, cors); }

    const contents = (Array.isArray(b.messages) ? b.messages : []).slice(-10)
      .map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content || '').slice(0, 4000) }] }));
    if (!contents.length) return json({ error: 'empty' }, 400, cors);
    if (b.image && b.image.data) contents[contents.length - 1].parts.unshift({ inline_data: { mime_type: b.image.mime || 'image/jpeg', data: String(b.image.data) } });
    const body = {
      system_instruction: { parts: [{ text: String(b.system || '').slice(0, 8000) }] },
      contents,
      generationConfig: { maxOutputTokens: 1200, temperature: Math.min(1, Math.max(0, +b.temp || 0.4)) }
    };

    let last;
    for (const m of MODELS) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_KEY }, body: JSON.stringify(body)
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok) {
        const t = ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).map(p => p.text || '').join('');
        if (t) return json({ text: t, model: m }, 200, cors);
      }
      last = (j.error && j.error.message) || r.status;
      if (r.status === 400 || r.status === 401 || r.status === 403) break;
    }
    return json({ error: String(last) }, 502, cors);
  }
};
