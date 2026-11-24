// GET /api/promo  ->  the sale dates plus the server's clock, so the shop pages show the right state
// even if a visitor's phone clock is wrong. Prices are NOT decided here (see lib/products.js).
import { PROMO, promoState } from '../lib/promo.js';

export default function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const now = Date.now();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
        now,
        name: PROMO.name,
        percent: PROMO.percent,
        saleLabel: PROMO.saleLabel,
        saleStart: PROMO.saleStart, saleEnd: PROMO.saleEnd,
        themeStart: PROMO.themeStart, themeEnd: PROMO.themeEnd,
        ...promoState(now),
    });
}
