// lib/paystack.js - tiny helpers shared by the api/ routes. Server only.
export async function paystack(path, init = {}) {
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (!key) throw new Error('PAYSTACK_SECRET_KEY is not set');
    const r = await fetch('https://api.paystack.co' + path, {
        ...init,
        headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
    let body = {};
    try { body = await r.json(); } catch (_) { /* no JSON body */ }
    return { status: r.status, ok: r.ok, body };
}

// The public address of the site, used for the return links.
export function siteOrigin(req) {
    const fixed = process.env.SITE_URL;
    if (fixed) return fixed.replace(/\/+$/, '');
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return 'https://' + host;
}
