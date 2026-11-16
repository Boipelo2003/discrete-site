// POST /api/paystack-webhook  - Paystack tells us a payment happened.
// 1. Checks the signature (HMAC-SHA512 of the raw body).
// 2. Checks the amount paid matches the price we calculated on the server.
// 3. Emails the owner (and the customer) via Resend, if RESEND_API_KEY is set.
// The order itself is the Paystack transaction, so there is nothing to save here.
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

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rand = n => 'R' + Number(n).toFixed(2);

async function sendEmail({ to, subject, html, replyTo }) {
    const key = process.env.RESEND_API_KEY;
    if (!key || !to) return false;
    const from = process.env.EMAIL_FROM || 'DISCRETE <onboarding@resend.dev>';
    try {
        const r = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, to: Array.isArray(to) ? to : [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
        });
        if (!r.ok) console.error('[email] Resend refused:', r.status, (await r.text()).slice(0, 200));
        return r.ok;
    } catch (err) { console.error('[email] failed:', err.message); return false; }
}

function itemRows(items) {
    return (Array.isArray(items) ? items : []).map(i =>
        `<tr><td style="padding:4px 12px 4px 0">${esc(i.quantity || 1)} x ${esc(i.name)}${i.size ? ' (' + esc(i.size) + (i.color ? ', ' + esc(i.color) : '') + ')' : ''}</td><td style="padding:4px 0;text-align:right">${i.price ? rand(Number(i.price) * (Number(i.quantity) || 1)) : ''}</td></tr>`).join('');
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const raw = await rawBody(req);
    if (!signatureOk(raw, req.headers['x-paystack-signature'])) return res.status(401).json({ error: 'Bad signature' });
    let event = {};
    try { event = JSON.parse(raw); } catch (_) { return res.status(400).end(); }

    if (event.event === 'charge.success' && event.data) {
        const d = event.data, m = d.metadata && typeof d.metadata === 'object' ? d.metadata : {};
        const ref = String(d.reference || '');
        const paid = Number(d.amount) / 100;
        const amountOk = !m.expected_total || Number(d.amount) === Math.round(Number(m.expected_total) * 100);

        if (!/^DSC-/.test(ref)) return res.status(200).json({ received: true });   // not a DISCRETE order
        if (!amountOk || d.currency !== 'ZAR') {
            console.error('[paid-MISMATCH]', ref, 'paid', rand(paid), 'expected', m.expected_total);
            await sendEmail({ to: process.env.OWNER_EMAIL || (process.env.ADMIN_EMAILS || '').split(',')[0], subject: `CHECK ORDER ${ref}: amount mismatch`, html: `<p>Order ${esc(ref)} was paid ${rand(paid)} but expected R${esc(m.expected_total)}. Do not ship until checked in Paystack.</p>` });
            return res.status(200).json({ received: true });
        }
        console.log('[paid]', ref, rand(paid));

        const owner = process.env.OWNER_EMAIL || (process.env.ADMIN_EMAILS || '').split(',')[0].trim();
        const customerEmail = d.customer && d.customer.email;
        const rows = itemRows(m.items);
        const table = `<table style="border-collapse:collapse;font-size:14px">${rows}<tr><td style="padding:8px 12px 0 0"><b>Total</b></td><td style="padding:8px 0 0;text-align:right"><b>${rand(paid)}</b></td></tr></table>`;

        await sendEmail({
            to: owner,
            subject: `New paid order ${ref} (${rand(paid)})`,
            replyTo: customerEmail,
            html: `<p><b>${esc(m.customer_name)}</b> paid for order <b>${esc(ref)}</b>.</p>${table}<p>Phone: ${esc(m.phone)}<br>Collect from: ${esc(m.collect_from)}<br>Delivery: ${esc(m.delivery)}<br>Customer email: ${esc(customerEmail)}</p><p>Update the status in the admin page once you ship it.</p>`,
        });
        await sendEmail({
            to: customerEmail,
            subject: `Order confirmed: ${ref}`,
            replyTo: owner,
            html: `<p>Hi ${esc(String(m.customer_name || '').split(' ')[0] || 'there')}, thanks for your order. Payment received.</p><p>Order number: <b>${esc(ref)}</b></p>${table}<p>Collection point: ${esc(m.collect_from)}<br>Delivery: ${esc(m.delivery)}</p><p>We will email you again when it ships. Questions? Reply to this email.</p><p>DISCRETE</p>`,
        });
    }
    return res.status(200).json({ received: true });
}
