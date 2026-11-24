// POST /api/quote  { items, code? }  ->  delivery options + totals (prices come from lib/products.js, never the browser)
import { deliveryOptions } from '../lib/products.js';

export default function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const q = deliveryOptions(req.body && req.body.items, Date.now(), req.body && req.body.code);
    if (!q) return res.status(400).json({ error: 'Invalid cart' });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(q);
}
