# Putting the DISCRETE site on Vercel and connecting Paystack

Everything below is done in your browser. No coding needed.

## What is in this folder
- The website pages (index.html, t-shirts.html, checkout.html ...), plus css/, js/ and images/
- `api/`: four small server files that talk to Paystack
  - `quote.js` works out delivery and totals
  - `paystack-init.js` starts the payment
  - `order-status.js` confirms the payment on the success page
  - `paystack-webhook.js` receives Paystack's "payment done" message
- `lib/`: the price list (`products.js`) and a Paystack helper
- `package.json`, `.gitignore`, `.env.example`

Not included: `/api/orders` (used by admin.html) and `/api/subscribe` (the newsletter box). If your live site already has those, keep them.

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
In the same screen (or later in Project, Settings, Environment Variables) add these three, one at a time:

| Name | Value |
|---|---|
| PAYSTACK_SECRET_KEY | your Live secret key (sk_live_...) |
| PAYSTACK_WEBHOOK_SECRET | your Webhook signing secret (whsec_...) |
| SITE_URL | https://your-real-domain (no slash at the end) |

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

## If something goes wrong
- "We could not start the payment": Vercel, your project, Logs. Look for `[paystack-init]`. Usually the key is missing or has a typo, or you forgot to Redeploy.
- Success page stays on "pending": Paystack's webhook/callback URL is wrong, or the test and live keys are mixed up.
- Delivery shows "We couldn't calculate delivery": the `api/quote.js` file is missing from the repository.

## Staying safe
- Turn on 2FA in Paystack (the pink banner at the top of the dashboard).
- Never share the full secret key. If it ever leaks, use the pencil icon next to it in Paystack to replace it, then update Vercel.
- Prices are checked on the server from `lib/products.js`. When you change a price on a page, change it in that file too.
