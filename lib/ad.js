// lib/ad.js - the one-day "websites from R350" advert. Edit the words here; nothing else needs touching.
//
// It appears as a pop-up when people open the shop, ONLY between start and end (South African time),
// and switches itself off afterwards. To run it again some other day, change start and end.
export const AD = {
    start: '2026-11-27T00:00:00+02:00',      // Friday 27 November, 00:00
    end:   '2026-11-28T00:00:00+02:00',      // Saturday 28 November, 00:00 (so: the 27th only)
    tag: 'ADVERT',                           // makes it clear this is not a DISCRETE product
    kicker: 'BLACK FRIDAY  ·  FRIDAY 27 NOVEMBER  ·  ONE DAY ONLY',
    headline: 'WEBSITES FROM R350',
    lead: 'Any website. Today only.',
    body: 'Need a website for your business, your brand or your online shop? I am Boipelo Mothibi, a web designer, and for Black Friday I build websites starting at R350.',
    name: 'Boipelo Mothibi',
    phoneDisplay: '069 320 5184',
    phoneIntl: '27693205184',                // digits only, South Africa code first (no + and no leading 0)
    whatsappText: 'Hi Boipelo, I saw your Black Friday website offer (websites from R350). I would like a website.',
    fine: 'Offer valid on Friday 27 November 2026 only.',
};

export function adActive(now = Date.now()) {
    const s = new Date(AD.start).getTime(), e = new Date(AD.end).getTime();
    return s < e && now >= s && now < e;     // misconfigured dates = no ad
}
