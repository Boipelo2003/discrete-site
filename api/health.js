// GET /api/health  - open https://your-domain/api/health in a browser to see if Paystack is set up.
// Shows YES/NO answers only. It never shows your keys. Delete this file once everything works.
import { paystack, siteOrigin } from '../lib/paystack.js';

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    const key = process.env.PAYSTACK_SECRET_KEY || '';
    const out = {
        secretKeySet: !!key,
        keyMode: key.startsWith('sk_live_') ? 'live' : key.startsWith('sk_test_') ? 'test' : key ? 'not a Paystack secret key' : 'none',
        paystackAcceptsKey: null,
        webhookSecretSet: !!process.env.PAYSTACK_WEBHOOK_SECRET,
        siteUrlSet: !!process.env.SITE_URL,
        customersReturnTo: siteOrigin(req) + '/success.html',
        problems: [],
    };
    if (key) {
        try { const r = await paystack('/transaction?perPage=1'); out.paystackAcceptsKey = r.ok; }
        catch (_) { out.paystackAcceptsKey = false; }
    }
    if (!key) out.problems.push('PAYSTACK_SECRET_KEY is missing in Vercel. Add it under Settings > Environment Variables, then Redeploy.');
    else if (out.paystackAcceptsKey === false) out.problems.push('Paystack rejected the secret key. It is probably old, mistyped or was replaced. Paste the current Live secret key into Vercel and Redeploy.');
    if (out.keyMode === 'test') out.problems.push('The site is using a TEST key. Real customer cards will not work until you use the Live key.');
    if (!out.webhookSecretSet) out.problems.push('PAYSTACK_WEBHOOK_SECRET is not set (optional, but recommended).');
    if (!out.siteUrlSet) out.problems.push('SITE_URL is not set. Add it as https://www.discreteclothing.co.za so customers always return to your own address.');
    else if (!/^https:\/\/[^/]+$/.test(process.env.SITE_URL.replace(/\/+$/, ''))) out.problems.push('SITE_URL must start with https:// and have no path, for example https://www.discreteclothing.co.za');
    out.allGood = out.problems.length === 0 || out.problems.every(p => p.startsWith('PAYSTACK_WEBHOOK_SECRET'));
    return res.status(200).json(out);
}
