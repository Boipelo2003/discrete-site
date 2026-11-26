# New Arrivals

The New Arrivals page is empty on purpose while the next stock is on its way, and the home page shows "NEW STOCK COMING SOON". The page is marked `noindex` and left out of `sitemap.xml` so Google does not list an empty page.

When new stock arrives (send the photos and prices and it can be set up for you):
1. Add the product cards to `new-arrivals.html` (inside the `product-grid`, replacing the "coming soon" block) and, if you like, the cards on the home page (`#new-arrivals`).
2. Add the products to `js/products.js` and `js/scripts.js` (search), and to `lib/products.js` (the server price list).
3. Remove the `noindex` line from `new-arrivals.html` and add `/new-arrivals` back to `sitemap.xml`.
4. When those pieces stop being new, move them to their section (T-shirts or Accessories) and empty this page again.
