// GET /api/order-status?id=DSC-...  ->  { status: complete | failed | pending, total, itemCount, firstItemName }
// Asks Paystack directly, so the success page can never be fooled by a made-up link.
import { paystack } from '../lib/paystack.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const id = String((req.query && req.query.id) || '');
    if (!/^[A-Za-z0-9_-]{3,40}$/.test(id)) return res.status(400).json({ error: 'Bad id' });
    res.setHeader('Cache-Control', 'no-store');

    let r;
    try { r = await paystack('/transaction/verify/' + encodeURIComponent(id)); }
    catch (err) { console.error('[order-status]', err.message); return res.status(502).json({ error: 'Could not check the payment' }); }
    if (r.status === 404) return res.status(404).json({ status: 'pending' });
    if (!r.ok || !r.body || !r.body.data) return res.status(502).json({ error: 'Could not check the payment' });

    const d = r.body.data, m = d.metadata || {};
    let status = 'pending';
    if (d.status === 'success') {
        const rightAmount = !m.expected_total || Number(d.amount) === Math.round(Number(m.expected_total) * 100);
        status = rightAmount && d.currency === 'ZAR' ? 'complete' : 'failed';     // paid the wrong amount = do not confirm
    } else if (d.status === 'failed' || d.status === 'reversed') status = 'failed';
    return res.status(200).json({ status, total: Number(d.amount) / 100, itemCount: Number(m.item_count) || 0, firstItemName: m.first_item || '' });
}
