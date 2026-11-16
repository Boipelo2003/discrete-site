# Putting the DISCRETE site on Vercel and connecting Paystack

Everything below is done in your browser. No coding needed.

## What is in this folder
- The website pages (index.html, t-shirts.html, checkout.html ...), plus css/, js/ and images/
- `api/`: small server files that talk to Paystack and Firebase
  - `quote.js` works out delivery and totals
  - `paystack-init.js` starts the payment
  - `order-status.js` confirms the payment on the success page
  - `paystack-webhook.js` receives Paystack's "payment done" message and sends the order emails
  - `orders.js` feeds admin.html (paid orders from Paystack, statuses saved in Firestore)
  - `health.js` setup checker (delete it once everything works)
- `lib/`: the price list (`products.js`), a Paystack helper and the admin login check (`adminAuth.js`)
- `package.json`, `.gitignore`, `.env.example`

Not included: `/api/subscribe` (there is no newsletter box on the site, so nothing needs it).

IMPORTANT: if your live project already has its own `api/` files, do not overwrite them. Send them to Claude to compare first.

## Step 1: Put the files on GitHub
1. Go to github.com and sign in. Click New repository. Name it `discrete-site`. Choose Private. Click Create.
2. Click "uploading an existing file". Drag in everything from inside the discrete-site folder (the pages, css, js, images, api, lib, package.json, .gitignore). The folders must keep their names.
3. Click Commit changes.
Check that `index.html` and the `api` folder are at the top level of the repository, not inside another folder.

## Step 2: Create the project on Vercel
1. Go to vercel.com and choose Continue with GitHub.
2. Click Add New, then Project. Pick your `discrete-site` repository and click Import.
3. Framework Preset: Other. Leave Build Command and Output Directory empty.
4. Do NOT click Deploy yet. Open Environment Variables first (Step 3).

## Step 3: Add your Paystack keys to Vercel
In the same screen (or later in Project, Settings, Environment Variables) add these, one at a time (the last three are for the admin page and emails, see below):

| Name | Value |
|---|---|
| PAYSTACK_SECRET_KEY | your Live secret key (sk_live_...) |
| PAYSTACK_WEBHOOK_SECRET | your Webhook signing secret (whsec_...) |
| SITE_URL | https://your-real-domain (no slash at the end) |
| ADMIN_EMAILS | the email you log in to admin.html with |
| RESEND_API_KEY | (optional) from resend.com, turns on order emails |
| EMAIL_FROM | (optional) e.g. DISCRETE <orders@your-domain>, a domain verified in Resend |

Where to find them: Paystack dashboard, Developers, API configuration.
- Live secret key: click the eye icon, then the copy icon.
- Webhook signing secret: the whsec_ row, click the eye, then copy.

Paste the secret key only into Vercel. Never into a website file, a chat or an email. The public key (pk_live_...) is not needed by this site.

Then click Deploy. Wait for "Congratulations". Click Visit to see the site on a vercel.app address.

Any time you change an environment variable, go to Deployments, open the latest one, and click Redeploy. New values only apply to new deployments.

## Step 4: Add your domain
Project, Settings, Domains, Add. Type your domain and follow the DNS instructions Vercel shows (your domain provider's dashboard). Update SITE_URL to match, then Redeploy.

## Step 5: Tell Paystack where to send messages
Paystack dashboard, Developers, API configuration, Legacy API keys:
- Live callback URL: Add callback URL, enter `https://your-domain/success.html`
- Live webhook URL: Add webhook URL, enter `https://your-domain/api/paystack-webhook`
Both must start with https. Save.

## Step 6: Test before real customers
1. In Paystack, switch off Live mode (top right) and copy the TEST secret key.
2. In Vercel, add `PAYSTACK_SECRET_KEY` for the Preview environment only, using the test key. Keep the live key on Production. Redeploy.
3. Open the Preview address, add an item, go through checkout, and pay with one of Paystack's test cards (listed in Paystack's documentation).
4. You should land on the success page showing Order confirmed. In Paystack, Transactions should show the payment with the customer's name, phone, store and items.
5. When happy, do one real small payment on the live site and refund it from Paystack to confirm everything works end to end.

## Check your setup in one click (api/health.js)
After deploying, open `https://your-domain/api/health` in your browser. It shows YES/NO answers (never your keys):
- `secretKeySet` should be true
- `keyMode` should say live (or test while you are testing)
- `paystackAcceptsKey` should be true
- `customersReturnTo` should be your own address ending in /success.html
- `problems` should be empty
Anything listed under `problems` tells you exactly what to fix in Vercel. Delete `api/health.js` from GitHub once everything works.

## Order emails (optional but recommended)
Paystack already emails customers a payment receipt. For a proper DISCRETE-branded confirmation and a new-order alert to you:
1. Create a free account at resend.com and verify your domain (it gives you DNS records to add).
2. Create an API key. In Vercel add `RESEND_API_KEY`, `EMAIL_FROM` and (optional) `OWNER_EMAIL`. Redeploy.
3. Place a test order. You should get "New paid order ..." and the customer gets "Order confirmed ...".
Without `RESEND_API_KEY` the site works as before and just logs the payment.

## Admin page (admin.html)
The admin page lists every PAID order straight from Paystack: customer, phone, items, sizes, collection store and total. You sign in with your Firebase admin login. Setup, once:

1. Vercel, Settings, Environment Variables: add `ADMIN_EMAILS` = the email you log in with (several emails can be separated with commas). Redeploy. Anyone not on this list is refused, even if they can sign in.
2. Firebase console (project discrete-studio), Authentication, Settings, Authorized domains: add `discreteclothing.co.za`. Without it, login fails on the new domain.
3. Firebase console, Authentication, Settings, User actions: turn OFF "Enable create (sign-up)" so nobody else can make accounts.
4. To mark orders Shipped, Delivered or Cancelled, the page saves those labels in Firestore. In Firebase console, Firestore Database (create it if needed), Rules, ADD this block inside the existing `match /databases/{database}/documents { ... }` section (do not delete your other rules):

```
match /orderStatus/{id} {
  allow read, write: if request.auth != null
    && request.auth.uid == "uNlct7BdhwP7ofd0lYiUT8DjiJn2";
}
```
Then click Publish. Without this step the admin page still shows all paid orders, but changing a status shows an error.

Admin access is by Firebase UID (built into `lib/adminAuth.js`: uNlct7BdhwP7ofd0lYiUT8DjiJn2). `ADMIN_EMAILS` and `ADMIN_UIDS` in Vercel are optional extras for more admins. If you ever lose the password: Firebase console, Authentication, Users, the three dots on your row, Reset password.

Open `https://www.discreteclothing.co.za/admin.html`, sign in, and your paid orders appear. Orders paid before this update show the item list as text; new orders show full details.

## If you cannot see the success page
The success page appears after Paystack sends the customer back. Check these in order:
1. Open `/api/health`. Fix anything under `problems`, then Redeploy.
2. Is `api` on GitHub? If checkout says "We could not start the payment", the customer never reaches Paystack, so there is no success page.
3. Did you pay on Paystack's page and wait for it to finish? Paystack returns the customer to your site automatically.
4. Press Ctrl+F5 on the success page to clear an old copy.
5. Success page messages: "Payment Successful" (paid), "Order Received" (still confirming, wait a minute and refresh), "Payment Not Completed" (failed or cancelled), "No Order Found" (the page was opened without an order number).

## If something goes wrong
- "We could not start the payment": Vercel, your project, Logs. Look for `[paystack-init]`. Usually the key is missing or has a typo, or you forgot to Redeploy.
- Success page stays on "pending": Paystack's webhook/callback URL is wrong, or the test and live keys are mixed up.
- Delivery shows "We couldn't calculate delivery": the `api/quote.js` file is missing from the repository.

## Staying safe
- Turn on 2FA in Paystack (the pink banner at the top of the dashboard).
- Never share the full secret key. If it ever leaks, use the pencil icon next to it in Paystack to replace it, then update Vercel.
- Prices are checked on the server from `lib/products.js`. When you change a price on a page, change it in that file too.
