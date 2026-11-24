# Influencer discount codes

Each influencer has a code that gives the customer **10% off the items** (delivery is not discounted).

| Influencer | Code | Link to share (applies the code automatically) |
|---|---|---|
| Keitu | `KEITU10` | https://www.discreteclothing.co.za/?code=KEITU10 |
| Kure | `KURE10` | https://www.discreteclothing.co.za/?code=KURE10 |
| Trudles | `TRUDLES10` | https://www.discreteclothing.co.za/?code=TRUDLES10 |
| Chantelle | `CHANTELLE10` | https://www.discreteclothing.co.za/?code=CHANTELLE10 |

## How customers use a code
1. Type it in the **Discount code** box on the checkout page and press **Apply** (capital letters do not matter), or just open the influencer's link, which remembers the code.
2. The checkout shows "Code KEITU10 (-10%)" and the lower total.

## Rules
- The **server** takes the discount off, so a customer cannot fake one. A wrong or switched-off code is refused with a clear message.
- Codes are **not stacked** with the Black Friday sale or each other: the customer gets the better of the two (both are 10%, so on 27 November a code gives the same 10%, credited to the influencer).
- A code can be used any number of times, by anyone who has it.

## Seeing who sold what
- Each order records the code: the admin page shows "Code KEITU10 (Keitu) 10% off (-R45.00)" on the order, and Paystack shows it as a "Promo" note.
- The admin page has an **Influencer codes** box above the orders: paid orders and money brought in per code.
- Search the admin orders for a code (for example `keitu10`), or use **Export CSV** (it has a "Promo / code" column) to work out commission.

## Changing codes (`lib/codes.js`)
- **Add an influencer:** copy a line, e.g. `NEWNAME10: { influencer: 'Newname', percent: 10, active: true },`
- **Switch a code off:** set `active: false` (or delete the line).
- **Expire a code automatically:** add `expires: '2026-12-31T23:59:59+02:00'` (South African time).
- **Different percentage:** change `percent` (whole number, 1 to 90).
