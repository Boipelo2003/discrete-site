// POST /api/paystack-init  ->  { authorization_url, orderId, total }
// Re-prices the cart on the server, then asks Paystack to start the payment.
import crypto from 'node:crypto';
import { quoteOrder } from '../lib/products.js';
import { paystack, siteOrigin } from '../lib/paystack.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v, max = 120) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const b = req.body || {};

    const q = quoteOrder(b.items, b.shippingId);            // null if anything is wrong with the cart
    if (!q) return res.status(400).json({ error: 'Your cart could not be priced. Please refresh and try again.' });

    const c = b.customer || {}, col = b.collection || {};
    const email = clean(c.email).toLowerCase(), fullName = clean(c.fullName), phone = clean(c.phone, 20);
    const storeName = clean(col.storeName, 160);
    if (!EMAIL.test(email) || fullName.length < 2 || phone.replace(/\D/g, '').length < 9)
        return res.status(400).json({ error: 'Please check your contact details.' });
    if (storeName.length < 3) return res.status(400).json({ error: 'Enter the PEP store you will collect from.' });

    const orderId = 'DSC-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const origin = siteOrigin(req);

    const lines = {};
    for (const i of b.items) {
        const k = `${clean(i.name, 70)} | ${clean(i.size, 8)}${i.color ? ' | ' + clean(i.color, 20) : ''}`;
        lines[k] = (lines[k] || 0) + (Number.isInteger(i.quantity) ? i.quantity : 1);
    }
    const itemText = Object.entries(lines).map(([k, n]) => `${n} x ${k}`).join('; ').slice(0, 1500);
    const firstItem = Object.keys(lines)[0].split(' | ')[0];

    const r = await paystack('/transaction/initialize', {
        method: 'POST',
        body: JSON.stringify({
            email,
            amount: Math.round(q.total * 100),               // Paystack wants cents
            currency: 'ZAR',
            reference: orderId,
            callback_url: `${origin}/success.html?order_id=${orderId}`,
            metadata: {
                order_id: orderId,
                expected_total: q.total,
                item_count: b.items.length,
                first_item: firstItem,
                cancel_action: `${origin}/cancel.html`,
                custom_fields: [
                    { display_name: 'Name', variable_name: 'name', value: fullName },
                    { display_name: 'Phone', variable_name: 'phone', value: phone },
                    { display_name: 'Collect from', variable_name: 'store', value: `${storeName}, ${clean(col.town, 60)}, ${clean(col.province, 40)}` },
                    { display_name: 'Delivery', variable_name: 'delivery', value: q.delivery.label },
                    { display_name: 'Items', variable_name: 'items', value: itemText },
                ],
            },
        }),
    }).catch(err => ({ ok: false, status: 0, body: { message: String(err.message) } }));

    if (!r.ok || !r.body || !r.body.status || !r.body.data || !r.body.data.authorization_url) {
        console.error('[paystack-init] Paystack refused:', r.status, r.body && r.body.message);
        return res.status(502).json({ error: 'We could not start the payment. Please try again.' });
    }
    return res.status(200).json({ authorization_url: r.body.data.authorization_url, orderId, total: q.total });
}
