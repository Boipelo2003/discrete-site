// GET  /api/orders?status=paid   -> { orders: [...] }   (admin only)
// POST /api/orders {id, status}  -> saves "shipped", "delivered" etc. for an order (admin only)
// Paid orders come straight from Paystack. The extra statuses you set are kept in Firestore (collection "orderStatus").
import { paystack } from '../lib/paystack.js';
import { requireAdmin } from '../lib/adminAuth.js';

const STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
const fsDocs = pid => `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/orderStatus`;
const field = (m, key) => {
    const f = (m.custom_fields || []).find(x => x && x.variable_name === key);
    return f ? String(f.value || '') : '';
};

function itemsOf(m) {
    if (Array.isArray(m.items)) return m.items.map(i => ({ name: i.name, size: i.size, color: i.color || '', quantity: Number(i.quantity) || 1, price: Number(i.price) || 0 }));
    // orders made before item details were saved: rebuild from the text line
    return field(m, 'items').split('; ').filter(Boolean).map(line => {
        const mm = /^(\d+) x (.*)$/.exec(line); const parts = (mm ? mm[2] : line).split(' | ');
        return { name: parts[0] || 'Item', size: parts[1] || '', color: parts[2] || '', quantity: mm ? Number(mm[1]) : 1, price: 0 };
    });
}

function toOrder(t, status) {
    const m = t.metadata && typeof t.metadata === 'object' ? t.metadata : {};
    const full = String(m.customer_name || field(m, 'name') || '').trim();
    const sp = full.indexOf(' ');
    const collect = String(m.collect_from || field(m, 'store') || '');
    return {
        id: t.reference,
        status,
        total: Number(t.amount) / 100,
        date: t.paid_at || t.created_at || null,
        customer: { firstName: sp > 0 ? full.slice(0, sp) : full, lastName: sp > 0 ? full.slice(sp + 1) : '', email: (t.customer && t.customer.email) || '', phone: String(m.phone || field(m, 'phone') || '') },
        items: itemsOf(m),
        shipping: { method: String(m.delivery || field(m, 'delivery') || ''), address: collect ? 'PEP PAXI collection point: ' + collect : '' },
    };
}

async function savedStatuses(admin) {
    const out = new Map();
    try {
        const r = await fetch(fsDocs(admin.projectId) + '?pageSize=300', { headers: { Authorization: 'Bearer ' + admin.token } });
        if (!r.ok) return out;
        const j = await r.json();
        for (const d of j.documents || []) {
            const id = String(d.name || '').split('/').pop();
            const st = d.fields && d.fields.status && d.fields.status.stringValue;
            if (id && STATUSES.includes(st)) out.set(id, st);
        }
    } catch (_) { /* statuses are optional */ }
    return out;
}

export default async function handler(req, res) {
    const admin = await requireAdmin(req, res);
    if (!admin) return;
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'GET') {
        const wanted = String((req.query && req.query.status) || '').toLowerCase();
        const raw = [];
        try {
            for (let page = 1; page <= 5; page++) {
                const r = await paystack(`/transaction?status=success&perPage=100&page=${page}`);
                if (!r.ok || !r.body || !Array.isArray(r.body.data)) throw new Error('Paystack ' + r.status);
                raw.push(...r.body.data);
                if (r.body.data.length < 100) break;
            }
        } catch (err) { console.error('[orders]', err.message); return res.status(502).json({ error: 'Could not load orders from Paystack' }); }
        const saved = await savedStatuses(admin);
        let orders = raw.filter(t => /^DSC-[A-Za-z0-9_-]+$/.test(String(t.reference))).map(t => toOrder(t, saved.get(t.reference) || 'paid'));
        if (wanted && STATUSES.includes(wanted)) orders = orders.filter(o => o.status === wanted);
        return res.status(200).json({ orders });
    }

    if (req.method === 'POST') {
        const { id, status } = req.body || {};
        if (!/^DSC-[A-Za-z0-9_-]{2,40}$/.test(String(id)) || !STATUSES.includes(status)) return res.status(400).json({ error: 'Bad order id or status' });
        const v = await paystack('/transaction/verify/' + encodeURIComponent(id)).catch(() => null);
        if (!v || !v.ok || !v.body || !v.body.data || v.body.data.status !== 'success') return res.status(404).json({ error: 'No paid order with that id' });
        const url = fsDocs(admin.projectId) + '/' + encodeURIComponent(id) + '?updateMask.fieldPaths=status&updateMask.fieldPaths=updatedAt';
        const r = await fetch(url, {
            method: 'PATCH',
            headers: { Authorization: 'Bearer ' + admin.token, 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields: { status: { stringValue: status }, updatedAt: { timestampValue: new Date().toISOString() } } }),
        });
        if (!r.ok) { console.error('[orders] Firestore refused status save:', r.status); return res.status(500).json({ error: 'Could not save the status. Check your Firestore rules.' }); }
        return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
}
