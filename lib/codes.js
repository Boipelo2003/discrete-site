// lib/codes.js - influencer / discount codes. Server only: the browser never decides a discount.
//
// A customer types the code at checkout (or follows the influencer's link, e.g.
// https://www.discreteclothing.co.za/?code=KEITU10 ) and the SERVER takes the percentage off every item.
// Codes ignore capital letters, spaces and dashes ("keitu-10" works). The order records which code was used.
//
// To add an influencer: copy a line below. To stop a code: set  active: false  (or delete the line).
// Optional: expires: '2026-12-31T23:59:59+02:00'  (South African time) switches a code off by itself.
export const CODES = {
    KEITU10:     { influencer: 'Keitu',     percent: 10, active: true },
    KURE10:      { influencer: 'Kure',      percent: 10, active: true },
    TRUDLES10:   { influencer: 'Trudles',   percent: 10, active: true },
    CHANTELLE10: { influencer: 'Chantelle', percent: 10, active: true },
};

export const normalizeCode = (raw) => String(raw == null ? '' : raw).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 30);

// -> { code, influencer, percent } when the code is real and switched on, otherwise null.
export function lookupCode(raw, now = Date.now()) {
    const code = normalizeCode(raw);
    if (!code || !Object.prototype.hasOwnProperty.call(CODES, code)) return null;
    const c = CODES[code];
    if (!c || c.active === false) return null;
    if (c.expires && !(now < new Date(c.expires).getTime())) return null;
    if (!Number.isInteger(c.percent) || c.percent < 1 || c.percent > 90) return null;   // misconfigured = no discount
    return { code, influencer: c.influencer, percent: c.percent };
}
