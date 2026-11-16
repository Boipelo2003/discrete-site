# DISCRETE: pre-launch testing checklist

Do this on the Vercel Preview address with the Paystack TEST key first, then once on live.

## 1. Setup check
- [ ] Open /api/health: secretKeySet true, paystackAcceptsKey true, customersReturnTo is your domain, problems empty
- [ ] Paystack dashboard: callback URL = https://DOMAIN/success.html, webhook URL = https://DOMAIN/api/paystack-webhook

## 2. Payment (test key, then one real small payment on live)
- [ ] Add item, go to checkout, pay with a Paystack test card
- [ ] Lands on success page: "Payment Successful"
- [ ] Paystack Transactions shows the payment with name, phone, store, items
- [ ] Vercel Logs show `[paid] DSC-...` (webhook fired)
- [ ] Owner email "New paid order" arrives, customer "Order confirmed" arrives (if Resend is on)
- [ ] Cancel on the Paystack page: lands on cancel.html, no order in admin
- [ ] Failed card: success page shows "Payment Not Completed"
- [ ] Live: pay a small amount, then refund it from Paystack

## 3. Admin
- [ ] admin.html login works for the owner account only
- [ ] The test order is listed with correct customer, items, total
- [ ] Set Shipped, refresh, still Shipped
- [ ] Set Delivered, refresh, still Delivered
- [ ] Set Cancelled, refresh, still Cancelled
- [ ] A non-admin account gets refused
- [ ] If status change errors: Firestore rule for /orderStatus not published (see VERCEL-SETUP.md)

## 4. Site
- [ ] Phone (Android + iPhone) and desktop: home, each category, cart, checkout
- [ ] All footer links open the right page (privacy, terms, refunds, shipping, FAQ, sizing, track order)
- [ ] No broken images
- [ ] Delivery quote works for each province
- [ ] WhatsApp button opens the right number
