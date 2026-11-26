// GET /api/ad  ->  { active, now, ...words }. The server clock decides whether the one-day ad is on.
import { AD, adActive } from '../lib/ad.js';

export default function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const now = Date.now();
    res.setHeader('Cache-Control', 'no-store');
    if (!adActive(now)) return res.status(200).json({ active: false, now });
    return res.status(200).json({ active: true, now, ...AD });
}
