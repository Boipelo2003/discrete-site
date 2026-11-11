// POST /api/paystack-webhook  - Paystack tells us a payment happened.
// Checks the signature (HMAC-SHA512 of the raw body) and records the event in the Vercel logs.
import crypto from 'node:crypto';

async function rawBody(req) {
    if (typeof req.body === 'string') return req.body;
    if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString('utf8');
    return raw || (req.body ? JSON.stringify(req.body) : '');
}
function signatureOk(raw, header) {
    if (!header) return false;
    const secrets = [process.env.PAYSTACK_SECRET_KEY, process.env.PAYSTACK_WEBHOOK_SECRET].filter(Boolean);
    return secrets.some(s => {
        const expected = crypto.createHmac('sha512', s).update(raw).digest('hex');
        const a = Buffer.from(expected), b = Buffer.from(String(header));
        return a.length === b.length && crypto.timingSafeEqual(a, b);
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const raw = await rawBody(req);
    if (!signatureOk(raw, req.headers['x-paystack-signature'])) return res.status(401).json({ error: 'Bad signature' });
    let event = {};
    try { event = JSON.parse(raw); } catch (_) { return res.status(400).end(); }
    if (event.event === 'charge.success' && event.data) {
        // Add your own follow-up here (email yourself, update a sheet, etc.)
        console.log('[paid]', event.data.reference, 'R' + (Number(event.data.amount) / 100).toFixed(2));
    }
    return res.status(200).json({ received: true });
}
