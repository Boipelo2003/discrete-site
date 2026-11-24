// GET /api/stock  ->  { D10: { left: 0 }, D15: { left: 2 } }   (limited / sold-out products only)
// The shop pages use this to show "Sold out" and "Limited - only N". The real limit is enforced in api/paystack-init.js.
import { STOCK, stockStatus, soldOutSkus } from '../lib/stock.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const out = {};
    for (const sku of soldOutSkus()) out[sku] = { left: 0 };          // sold out is always known, even if Paystack is unreachable
    try {
        const st = await stockStatus(Object.keys(STOCK), { holds: false });
        for (const [sku, v] of Object.entries(st)) out[sku] = { left: v.left };
        res.setHeader('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=60');
    } catch (err) {
        console.error('[stock]', err.message);
        res.setHeader('Cache-Control', 'no-store');
    }
    return res.status(200).json(out);
}
