# DISCRETE: pre-launch testing checklist

Do this on the Vercel Preview address with the Paystack TEST key first, then once on live.

## 1. Setup check
- [ ] Vercel env vars set: PAYSTACK_SECRET_KEY, SITE_URL (https://www.discreteclothing.co.za), ADMIN_EMAILS. (/api/health was removed for security.)
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

## 5. Security headers (after the hardening update)
- [ ] Browser console (F12) shows no red "Content Security Policy" errors on home, cart, checkout, success, cancel, admin
- [ ] Fonts and images load; admin login works
- [ ] On the success page, "Download receipt (PDF)" still works (jsPDF integrity check)
- [ ] Firebase: Authentication > Settings: turn OFF user sign-up; turn ON 2-step verification for the owner account
- [ ] Firebase: Firestore rules allow ONLY the admin to read/write orderStatus, and deny everything else
