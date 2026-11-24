// POST /api/paystack-init  ->  { authorization_url, orderId, total }
// Re-prices the cart on the server, then asks Paystack to start the payment.
import crypto from 'node:crypto';
import { quoteOrder } from '../lib/products.js';
import { paystack, siteOrigin } from '../lib/paystack.js';
import { checkStock } from '../lib/stock.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v, max = 120) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const b = req.body || {};

    const now = Date.now();                                  // one clock reading, so the sale state is the same everywhere below
    const q = quoteOrder(b.items, b.shippingId, now, b.code);   // null if anything is wrong with the cart
    if (!q) return res.status(400).json({ error: 'Your cart could not be priced. Please refresh and try again.' });
    if (q.codeResult && !q.codeResult.ok) return res.status(400).json({ error: 'That discount code is not valid or has expired. Please remove it and try again.' });

    const c = b.customer || {}, col = b.collection || {};
    const email = clean(c.email).toLowerCase(), fullName = clean(c.fullName), phone = clean(c.phone, 20);
    const storeName = clean(col.storeName, 160);
    if (!EMAIL.test(email) || fullName.length < 2 || phone.replace(/\D/g, '').length < 9)
        return res.status(400).json({ error: 'Please check your contact details.' });
    if (storeName.length < 3) return res.status(400).json({ error: 'Enter the PEP store you will collect from.' });

    // e.g. "Code KEITU10 (Keitu) 10% off (-R45.00)" or "Black Friday 10% off (-R45.00)": saved on the order so you can see who drove each sale
    const promoText = q.discount ? `${q.discount.label}${q.discount.influencer ? ' (' + q.discount.influencer + ')' : ''} ${q.discount.percent}% off (-R${q.discount.amount.toFixed(2)})` : '';
    const stock = await checkStock(b.items, email);          // limited-edition items: refuse if there is not enough left
    if (!stock.ok) return res.status(400).json({ error: stock.message });

    const orderId = 'DSC-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    const origin = siteOrigin(req);

    const lines = {};
    for (const i of b.items) {
        const k = `${clean(i.name, 70)} | ${clean(i.size, 8)}${i.color ? ' | ' + clean(i.color, 20) : ''}`;
        lines[k] = (lines[k] || 0) + (Number.isInteger(i.quantity) ? i.quantity : 1);
    }
    // structured copy for the admin page: one line per product/size/colour with its unit price
    const detail = {};
    for (const i of b.items) {
        const k = `${clean(i.name, 70)}|${clean(i.size, 8)}|${i.color ? clean(i.color, 20) : ''}`;
        const unit = quoteOrder([{ name: i.name }], b.shippingId, now, b.code).merchandise;
        const d = detail[k] || (detail[k] = { name: clean(i.name, 70), size: clean(i.size, 8), color: i.color ? clean(i.color, 20) : '', quantity: 0, price: unit });
        d.quantity += Number.isInteger(i.quantity) ? i.quantity : 1;
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
                customer_name: fullName,
                phone,
                collect_from: `${storeName}, ${clean(col.town, 60)}, ${clean(col.province, 40)}`,
                delivery: q.delivery.label,
                promo: promoText,
                discount_code: (q.discount && q.discount.code) || '',
                items: Object.values(detail),
                cancel_action: `${origin}/cancel.html`,
                custom_fields: [
                    { display_name: 'Name', variable_name: 'name', value: fullName },
                    { display_name: 'Phone', variable_name: 'phone', value: phone },
                    { display_name: 'Collect from', variable_name: 'store', value: `${storeName}, ${clean(col.town, 60)}, ${clean(col.province, 40)}` },
                    { display_name: 'Delivery', variable_name: 'delivery', value: q.delivery.label },
                    { display_name: 'Items', variable_name: 'items', value: itemText },
                    ...(q.discount ? [{ display_name: 'Promo', variable_name: 'promo', value: promoText }] : []),
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
