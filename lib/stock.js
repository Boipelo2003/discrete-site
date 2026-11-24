// lib/stock.js - REAL stock limits for limited-edition products. Server only.
//
// How it works: Paystack is the record of every sale, so we count the units sold from there
// (no extra database needed). Units in somebody else's unfinished checkout are held for a few
// minutes so two people can't both grab the last piece. api/paystack-init.js refuses any order
// that goes over the limit, api/stock.js feeds the live "only N left" label on the shop pages,
// and the webhook emails you if an order is ever paid that should not have been.
import { paystack } from './paystack.js';

// ── EDIT HERE ─────────────────────────────────────────────────────────────────────────────────
// remaining = how many you had on the date in asOf. Everything sold AFTER asOf is subtracted
// automatically. To restock or change a limit: edit "remaining" AND set "asOf" to right now.
// A product that is not listed here is not limited.
// remaining: 0 means SOLD OUT. The server refuses it, and the shop pages show "Sold out" by themselves.
export const STOCK = {
    D10: { remaining: 0, asOf: '2026-11-24T00:00:00+02:00' },   // Discrete Knitted Beanies: SOLD OUT
    D15: { remaining: 3, asOf: '2026-11-17T00:00:00+02:00' },   // The Founder’s Mark Tee
};
const HOLD_MINUTES = 10;   // how long an unfinished checkout holds its units
// ──────────────────────────────────────────────────────────────────────────────────────────────

export const soldOutSkus = () => Object.keys(STOCK).filter(s => STOCK[s].remaining <= 0);
export const skuOf = (name) => { const m = /^(D\d+)\b/i.exec(String(name == null ? '' : name)); return m ? m[1].toUpperCase() : null; };
const unitsOfItem = (i) => (Number.isInteger(i && i.quantity) && i.quantity >= 1 ? i.quantity : 1);

async function listTransactions(status, fromIso) {
    const out = [];
    for (let page = 1; page <= 10; page++) {
        const r = await paystack(`/transaction?status=${status}&perPage=100&page=${page}&from=${encodeURIComponent(fromIso)}`);
        if (!r.ok || !r.body || !Array.isArray(r.body.data)) throw new Error('Paystack ' + r.status);
        out.push(...r.body.data);
        if (r.body.data.length < 100) break;
    }
    return out.filter(t => /^DSC-/.test(String(t.reference || '')));
}

function unitsInTransaction(t, sku) {
    const m = t.metadata && typeof t.metadata === 'object' ? t.metadata : {};
    if (!Array.isArray(m.items)) return 0;
    return m.items.reduce((n, i) => n + (skuOf(i && i.name) === sku ? unitsOfItem(i) : 0), 0);
}

// { D15: { limit, sold, held, left } } for the limited products in `skus`.
// email: the person checking out. Their own unfinished checkouts are not counted against them.
// holds: false = ignore other people's unfinished checkouts (used for the public display).
export async function stockStatus(skus, { email = '', holds = true } = {}) {
    const all = [...new Set(skus)].filter(s => STOCK[s]);
    const result = {};
    // Sold-out items (remaining 0) need no lookup: the answer is always "none left".
    for (const sku of all.filter(s => STOCK[s].remaining <= 0)) result[sku] = { limit: 0, sold: 0, held: 0, left: 0 };
    const limited = all.filter(s => STOCK[s].remaining > 0);
    if (!limited.length) return result;
    const earliest = Math.min(...limited.map(s => new Date(STOCK[s].asOf).getTime()));
    const paid = await listTransactions('success', new Date(earliest).toISOString());
    const held = holds ? await listTransactions('abandoned', new Date(Date.now() - HOLD_MINUTES * 60000).toISOString()) : [];
    const me = String(email || '').toLowerCase();
    for (const sku of limited) {
        const since = new Date(STOCK[sku].asOf).getTime();
        const sold = paid.reduce((n, t) => n + (new Date(t.created_at || t.paid_at || 0).getTime() >= since ? unitsInTransaction(t, sku) : 0), 0);
        const holdN = held.reduce((n, t) => n + (String((t.customer && t.customer.email) || '').toLowerCase() === me && me ? 0 : unitsInTransaction(t, sku)), 0);
        result[sku] = { limit: STOCK[sku].remaining, sold, held: holdN, left: Math.max(0, STOCK[sku].remaining - sold - holdN) };
    }
    return result;
}

// Used by paystack-init: { ok: true } or { ok: false, message }.
export async function checkStock(items, email) {
    const want = {}, names = {};
    for (const i of Array.isArray(items) ? items : []) {
        const sku = skuOf(i && i.name);
        if (sku && STOCK[sku]) { want[sku] = (want[sku] || 0) + unitsOfItem(i); names[sku] = String(i.name).replace(/[<>]/g, '').slice(0, 70); }
    }
    const skus = Object.keys(want);
    if (!skus.length) return { ok: true };
    let st;
    try { st = await stockStatus(skus, { email }); }
    catch (err) { console.error('[stock]', err.message); return { ok: false, message: 'We could not check stock right now. Please try again in a moment.' }; }
    for (const sku of skus) {
        const s = st[sku];
        if (want[sku] <= s.left) continue;
        if (s.left === 0 && s.sold >= s.limit) return { ok: false, message: `Sorry, ${names[sku]} is sold out.` };
        if (s.left === 0) return { ok: false, message: `${names[sku]} is being held in other shoppers’ checkouts right now. Please try again in a few minutes.` };
        return { ok: false, message: `Sorry, only ${s.left} of ${names[sku]} ${s.left === 1 ? 'is' : 'are'} left. Please lower the quantity in your cart.` };
    }
    return { ok: true };
}
