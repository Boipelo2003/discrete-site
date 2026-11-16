// GET /api/stock  ->  { D15: { left: 2 } }   (limited-edition products only; used for the "only N left" label)
import { STOCK, stockStatus } from '../lib/stock.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const st = await stockStatus(Object.keys(STOCK), { holds: false });
        const out = {};
        for (const [sku, v] of Object.entries(st)) out[sku] = { left: v.left };
        res.setHeader('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=60');
        return res.status(200).json(out);
    } catch (err) {
        console.error('[stock]', err.message);
        return res.status(502).json({ error: 'Could not check stock' });
    }
}
