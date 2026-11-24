// lib/products.js
// (Black Friday: lib/promo.js decides if a discount is on. The discount is applied HERE, on the server, per unit.)
import { PROMO, promoState } from './promo.js';
import { lookupCode, normalizeCode } from './codes.js';

// SERVER-SIDE source of truth for prices AND delivery fees.
// Used by api/paystack-init.js (what Paystack charges) and api/quote.js (what cart and checkout show). The browser never decides what a customer pays.

// ── PRICES (rands). Keep in step with the prices on your pages and in js/products.js ──
const PRICES = {
    'D01 — Discrete Earth Guardian Tee':          400,
    'D02 — Discrete Archive Tee (Works Graphic)': 400,
    'D05 — Discrete Petal Code Tee':              400,
    'D10 — Discrete Knitted Beanies':             250,
    'D11 — DSC Beanies':                          150,
    'D13 — Discrete Halo Tee':                    400,
    'D14 — The Brand Carrier Tee':                450,
    'D15 — The Founder’s Mark Tee':               450,
    'D16 — The Unseen Archive Tee':               450,
    'D17 — Discrete Check Flannel':               500,
    'D18 — Keys to Origin Tee':                   450,
    'D19 — Off The Record Tee':                   450,
};

// ── HOW MUCH ROOM EACH PRODUCT TAKES IN A DELIVERY BAG ──
// Measured in "tee-equivalents" (1 folded tee = 1). EDIT THESE after test-packing a few
// orders. A product missing from this list counts as 1.
const PACK_UNITS = {
    D01: 1, D02: 1, D05: 1, D13: 1, D14: 1, D15: 1, D16: 1, D18: 1, D19: 1,   // tees
    D17: 1,                                            // check flannel (adjust after test-packing)
    D10: 0.5, D11: 0.5,  // beanies
};
const STANDARD_BAG_CAPACITY = 3;   // up to 3 tee-equivalents fit a Standard Bag (45cm x 37cm, 5kg)
const LARGE_BAG_CAPACITY    = 8;   // up to 8 fit a Large Bag (64cm x 51cm, 10kg); more = extra bags

// ── DELIVERY FEES: PEP PAXI's prices, in CENTS, per bag ──
export const DELIVERY = {
    standard: { label: 'PEP PAXI Standard', eta: '7–9 business days', perBag: { standard: 5995,  large: 10995 } },
    express:  { label: 'PEP PAXI Express',  eta: '3–5 business days', perBag: { standard: 10995, large: 13995 } },
};
const DEFAULT_DELIVERY = 'standard';

// ── SAFETY LIMITS ──
const MAX_LINES = 60;   // cart lines in one order
const MAX_QTY   = 20;   // per line, only if a line carries an explicit quantity

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const skuOf = (name) => { const m = /^(D\d+)\b/i.exec(String(name)); return m ? m[1].toUpperCase() : null; };

const PRICE_BY_SKU = {};
for (const [name, price] of Object.entries(PRICES)) PRICE_BY_SKU[skuOf(name)] = price;

// Exact name first; otherwise fall back to the product code (D02, D09 ...) so a small
// wording change to a product title on a page can't make an item fail at checkout.
function priceFor(name) {
    if (typeof name !== 'string') return undefined;
    if (has(PRICES, name)) return PRICES[name];
    const sku = skuOf(name);
    return sku && has(PRICE_BY_SKU, sku) ? PRICE_BY_SKU[sku] : undefined;
}

// Quantity: if a line has none it counts as 1 (the cart adds one line per unit).
// Anything else must be a whole number from 1 to MAX_QTY. Negative / fractional /
// huge values are REJECTED (they could be used to shrink the total).
function qtyOf(item) {
    const q = item.quantity;
    if (q === undefined || q === null) return 1;
    return Number.isInteger(q) && q >= 1 && q <= MAX_QTY ? q : null;
}

// One unit's price in cents after a percentage discount (rounded per unit, so every line adds up).
const off = (cents, pct) => Math.round(cents * (100 - pct) / 100);

function priceItems(items, pct) {
    if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) return null;
    let merchCents = 0, listCents = 0, units = 0;
    for (const item of items) {
        if (!item || typeof item !== 'object') return null;
        const price = priceFor(item.name);
        const qty = qtyOf(item);
        if (price === undefined || qty === null) return null;      // unknown product / bad quantity = reject
        const unitList = Math.round(price * 100);
        listCents  += unitList * qty;
        merchCents += (pct ? off(unitList, pct) : unitList) * qty;
        const sku = skuOf(item.name);
        units += (sku && has(PACK_UNITS, sku) ? PACK_UNITS[sku] : 1) * qty;
    }
    return { merchCents, listCents, units };
}

function packBags(units) {
    if (units <= STANDARD_BAG_CAPACITY) return { size: 'standard', count: 1 };
    return { size: 'large', count: Math.ceil(units / LARGE_BAG_CAPACITY) };
}

// Full server-side quote for one cart + one delivery speed. Returns null if anything is invalid.
export function quoteOrder(items, deliveryId = DEFAULT_DELIVERY, now = Date.now(), code = '') {
    if (typeof deliveryId !== 'string' || !has(DELIVERY, deliveryId)) return null;
    // Discounts are never stacked: the customer gets the better of the sale (Black Friday) and their code.
    const salePct = promoState(now).saleActive ? PROMO.percent : 0;
    const found = lookupCode(code, now);
    const codePct = found ? found.percent : 0;
    const pct = Math.max(salePct, codePct);
    const byCode = codePct > 0 && codePct >= salePct;
    const priced = priceItems(items, pct);
    if (!priced) return null;
    const method = DELIVERY[deliveryId];
    const bag = packBags(priced.units);
    const shipCents = method.perBag[bag.size] * bag.count;
    return {
        merchandise: priced.merchCents / 100,                 // what the customer pays for the goods (after any discount)
        listMerchandise: priced.listCents / 100,              // normal prices added up
        discount: pct > 0 && priced.listCents > priced.merchCents
            ? { label: byCode ? 'Code ' + found.code : PROMO.name, percent: pct, amount: (priced.listCents - priced.merchCents) / 100,
                code: byCode ? found.code : null, influencer: byCode ? found.influencer : null } : null,
        // what happened to the code the customer typed (null if they typed none)
        codeResult: normalizeCode(code) === '' ? null
            : found ? { ok: true, code: found.code, applied: byCode }
            : { ok: false, message: 'That code is not valid or has expired.' },
        shippingFee: shipCents / 100,
        total:       (priced.merchCents + shipCents) / 100,
        bag,
        delivery: { id: deliveryId, label: method.label, eta: method.eta },
    };
}

// What checkout shows: every delivery speed with its fee and the resulting total.
export function deliveryOptions(items, now = Date.now(), code = '') {
    const base = quoteOrder(items, DEFAULT_DELIVERY, now, code);
    if (!base) return null;
    return {
        merchandise: base.merchandise,
        listMerchandise: base.listMerchandise,
        discount: base.discount,
        codeResult: base.codeResult,
        bag: base.bag,
        options: Object.keys(DELIVERY).map(id => {
            const q = quoteOrder(items, id, now, code);
            return { id, label: q.delivery.label, eta: q.delivery.eta, fee: q.shippingFee, total: q.total };
        }),
    };
}

// Backwards-compatible helper: the amount to charge, or null if the cart is invalid.
export function computeOrderTotal(items, deliveryId = DEFAULT_DELIVERY) {
    const q = quoteOrder(items, deliveryId);
    return q ? q.total : null;
}