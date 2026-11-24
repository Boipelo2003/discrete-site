# Black Friday 2026 (10% off, Friday 27 November only)

Everything is controlled from ONE file: `lib/promo.js`. It switches itself on and off. Nothing needs to be deployed on the day.

| What | When (South African time) |
|---|---|
| Black Friday look + countdown ("Starts in ...") | from 00:00 Mon 23 Nov |
| 10% discount on every product | 00:00 Fri 27 Nov to 23:59:59 Fri 27 Nov |
| Back to the normal site (look and prices) | 00:00 Sat 28 Nov |

## How it works
- The **server** decides what customers pay (`lib/products.js` + `api/paystack-init.js`). A browser cannot change the price.
- The pages only change how they LOOK while the sale is on (`js/promo.js`, `css/blackfriday.css`). Outside the dates they do nothing, so nothing is left behind.
- The discount is 10% of each item's price (R450 -> R405, R400 -> R360, R250 -> R225, R150 -> R135). Delivery is not discounted.
- An order is priced at the moment the customer clicks Pay. Paid orders keep the price they were charged. The admin page and Paystack show "Black Friday 10% off" on discounted orders.
- A customer who starts at 23:59 and pays after midnight gets "The total changed. Please check your cart and try again." and simply sees the normal price.

## Changing it
Edit the values at the top of `lib/promo.js` (`percent`, `saleStart`, `saleEnd`, `themeStart`, `themeEnd`, `saleLabel`), then push as usual.

## Emergency off switch
If anything looks wrong on the day, set `themeEnd` and `saleEnd` to a date in the past (for example `'2026-11-01T00:00:00+02:00'`) in `lib/promo.js` and push. The shop is back to normal in about a minute.

## Quick check on the day
1. Home page: "BLACK FRIDAY IS LIVE" bar, -10% badges, struck-through prices.
2. Add a tee to the cart: cart and checkout show a "Black Friday (-10%)" line and the lower total.
3. One small real payment, then check Paystack shows the discounted amount, then refund it.
