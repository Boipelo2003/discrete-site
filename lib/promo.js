// lib/promo.js - the ONE place that controls the Black Friday theme and discount. Server only.
//
// Everything is automatic: the theme switches on at themeStart, the discount switches on at saleStart,
// and BOTH switch themselves off again, so the shop goes back to normal with no deployment.
// All times are South African time (+02:00). The ends are "up to, but not including".
//
// To reuse for another sale: change the dates / percent / name below. To switch it off completely:
// set themeEnd and saleEnd to a date in the past (or delete the two promo lines in api/ - see BLACK-FRIDAY.md).
export const PROMO = {
    name: 'Black Friday',
    percent: 10,                                   // whole number, 1 to 90
    saleLabel: 'FRIDAY 27 NOVEMBER',               // shown on the site
    saleStart:  '2026-11-27T00:00:00+02:00',       // discount starts: 00:00 on Friday 27 November
    saleEnd:    '2026-11-28T00:00:00+02:00',       // discount ends:   00:00 on Saturday 28 November (so it is the 27th only)
    themeStart: '2026-11-23T00:00:00+02:00',       // Black Friday look + countdown starts
    themeEnd:   '2026-11-28T00:00:00+02:00',       // Black Friday look ends: back to normal
};

const ms = (s) => new Date(s).getTime();
const valid = Number.isInteger(PROMO.percent) && PROMO.percent >= 1 && PROMO.percent <= 90;

// What is on right now? now = milliseconds (Date.now()). Anything misconfigured fails SAFE (no discount).
export function promoState(now = Date.now()) {
    const saleOk  = valid && ms(PROMO.saleStart)  < ms(PROMO.saleEnd);
    const themeOk = ms(PROMO.themeStart) < ms(PROMO.themeEnd);
    return {
        saleActive:  saleOk  && now >= ms(PROMO.saleStart)  && now < ms(PROMO.saleEnd),
        themeActive: themeOk && now >= ms(PROMO.themeStart) && now < ms(PROMO.themeEnd),
    };
}

// Price of ONE unit in cents after the discount (rounded to the nearest cent).
export const discountedCents = (cents) => Math.round(cents * (100 - PROMO.percent) / 100);
