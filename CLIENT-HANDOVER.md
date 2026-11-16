# DISCRETE: how to run your website

## Where things live
- Website: https://www.discreteclothing.co.za (hosted on Vercel, code on GitHub)
- Payments and orders: Paystack dashboard, Transactions
- Order management: https://www.discreteclothing.co.za/admin.html
- Customer emails: Resend (if enabled)

## Daily: handling an order
1. You get a "New paid order" email (and see it in admin.html).
2. Open admin.html, sign in. The order shows customer, phone, items, sizes and the PEP collection store.
3. Pack it and send it via PAXI to that store.
4. Set the status to Shipped. When it arrives, Delivered. If it is cancelled and refunded, Cancelled.
5. Refunds are done in Paystack: Transactions, open the payment, Refund.

## Changing prices or products
Prices are checked on the server. When you change a price on a page you must also change it in `lib/products.js`, otherwise checkout will refuse the cart. Ask your developer (BBA Media) to add or change products.

## If something breaks
- Check the Vercel project: Settings > Environment Variables (PAYSTACK_SECRET_KEY, SITE_URL), then Deployments > Logs. (The old /api/health page was removed for security.)
- Customers cannot pay: usually the Paystack key in Vercel is wrong or Vercel was not redeployed after a change.
- Orders missing from admin: sign in again; check ADMIN_EMAILS in Vercel.
- Lost admin password: Firebase console, Authentication, Users, Reset password.

## Keep safe
- Turn on 2FA on Paystack, Vercel, GitHub and Firebase.
- Never send secret keys (sk_live_...) in chat or email. If leaked, replace in Paystack and update Vercel.

## Policies on the site
Privacy, Terms, Refund and Shipping pages were drafted for DISCRETE and must be read and approved by the owner. Update the date at the top when you change them.

## Support
BBA Media: (add contact details)
