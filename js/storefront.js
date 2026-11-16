/* =====================================================================
   js/storefront.js  —  shared by every page.
   • Cookie consent: banner + settings panel (every page)
   • Wishlist: hearts on product cards, nav heart icon with count, drawer
     (only on pages that load js/products.js, i.e. the shop pages)
   Needs css/storefront.css. Builds its own markup, so pages only add the
   <link> and <script> tags. Does not depend on js/scripts.js.
   ===================================================================== */
(function () {
    'use strict';

    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    var esc = function (s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    };
    var store = {
        get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked: stay in-memory */ } }
    };
    function mount(html) {
        var t = document.createElement('div');
        t.innerHTML = html.trim();
        var el = t.firstChild;
        document.body.appendChild(el);
        return el;
    }

    /* ======================= WISHLIST ======================= */
    var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"/></svg>';
    var THUMB = {
        D01: 'images/d01-black-front.webp', D02: 'images/d02-front.webp', 
        D05: 'images/d05-front.webp', 
        D08: 'images/d08.jpg', 
        D10: 'images/discrete-knitted-beanie.webp', D11: 'images/dsc-beanie-black.webp',
        D13: 'images/discrete-halo-tee-front.webp',
        D14: 'images/d14-blue-front.webp', D18: 'images/d18-front.webp', D19: 'images/d19-front.webp', D15: 'images/d15-front.webp', D16: 'images/d16-front.webp', D17: 'images/d17-red-front.webp'
    };
    var skuOf = function (name) { var m = String(name || '').match(/^(D\d+)/i); return m ? m[1].toUpperCase() : ''; };

    function findCard(sku) {
        return $$('.product-card').filter(function (c) {
            var t = $('.product-title', c);
            return t && t.textContent.trim().toUpperCase().indexOf(sku) === 0;
        })[0] || null;
    }
    function highlight(card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.style.outline = '2px solid #ff3b5c';
        card.style.outlineOffset = '8px';
        setTimeout(function () { card.style.outline = ''; card.style.outlineOffset = ''; }, 2500);
    }

    function initWishlist() {
        var hasCatalogue = typeof ALL_PRODUCTS !== 'undefined' && Array.isArray(ALL_PRODUCTS) && ALL_PRODUCTS.length;
        var meta = $('.nav-meta');
        if (!hasCatalogue || !meta) return;                       // legal / help pages: no wishlist

        var catalogue = {};
        ALL_PRODUCTS.forEach(function (p) { var s = skuOf(p.name); if (s) catalogue[s] = p; });

        var KEY = 'discrete_wishlist', wish = [];
        try { wish = JSON.parse(store.get(KEY) || '[]'); if (!Array.isArray(wish)) wish = []; } catch (e) { wish = []; }

        // nav heart + badge (placed just before the cart icon)
        var link = document.createElement('a');
        link.href = '#wishlist'; link.title = 'Wishlist'; link.className = 'sf-wish-link';
        link.setAttribute('aria-label', 'Wishlist');
        link.innerHTML = HEART + '<span id="sfWishBadge" class="sf-wish-badge" aria-live="polite"></span>';
        var cartIcon = $('a.cart-icon-wrapper', meta);
        meta.insertBefore(link, cartIcon || null);

        // drawer
        var overlay = mount(
            '<div class="sf-wish-overlay" id="wishlist" aria-hidden="true">' +
            '<div class="sf-wish-panel" role="dialog" aria-label="Your wishlist">' +
            '<div class="sf-wish-head"><h4>YOUR WISHLIST</h4><button type="button" class="sf-wish-close" id="sfWishClose" aria-label="Close wishlist">&times;</button></div>' +
            '<div class="sf-wish-list" id="sfWishList"></div>' +
            '<div class="sf-wish-foot">SAVED ON THIS DEVICE</div></div></div>');
        var list = $('#sfWishList', overlay), badge = $('#sfWishBadge', link);

        function save() { store.set(KEY, JSON.stringify(wish)); }
        function toggle(sku) {
            var i = wish.indexOf(sku);
            if (i === -1) wish.push(sku); else wish.splice(i, 1);
            save(); sync();
        }
        function open() { overlay.classList.add('open'); overlay.setAttribute('aria-hidden', 'false'); }
        function close() { overlay.classList.remove('open'); overlay.setAttribute('aria-hidden', 'true'); }
        window.addEventListener('discrete:escape', close);

        function renderList() {
            list.textContent = '';
            var shown = wish.filter(function (s) { return catalogue[s]; });
            if (!shown.length) {
                var p = document.createElement('p');
                p.className = 'sf-wish-empty';
                p.textContent = 'Nothing saved yet. Tap the heart on any piece to save it for later.';
                list.appendChild(p);
                return;
            }
            shown.forEach(function (sku) {
                var item = catalogue[sku];
                var row = document.createElement('div'); row.className = 'sf-wish-row';
                if (THUMB[sku]) { var im = document.createElement('img'); im.src = THUMB[sku]; im.alt = item.name; row.appendChild(im); }
                var info = document.createElement('div'); info.className = 'sf-wish-info';
                var a = document.createElement('a');
                a.href = (item.page || 'index.html') + '?find=' + encodeURIComponent(sku);
                a.textContent = item.name;
                a.addEventListener('click', function (e) {
                    var here = location.pathname.split('/').pop() || 'index.html';
                    var card = (item.page === here || !item.page) ? findCard(sku) : null;
                    if (card) { e.preventDefault(); close(); setTimeout(function () { highlight(card); }, 300); }
                });
                var pr = document.createElement('span'); pr.textContent = item.price;
                info.appendChild(a); info.appendChild(pr);
                var rm = document.createElement('button');
                rm.type = 'button'; rm.className = 'sf-wish-remove';
                rm.setAttribute('aria-label', 'Remove ' + item.name + ' from wishlist');
                rm.textContent = '\u00d7';
                rm.addEventListener('click', function () { toggle(sku); });
                row.appendChild(info); row.appendChild(rm);
                list.appendChild(row);
            });
        }
        function sync() {
            $$('.sf-wish-btn').forEach(function (b) {
                var on = wish.indexOf(b.getAttribute('data-pid')) !== -1;
                b.classList.toggle('is-active', on);
                b.setAttribute('aria-pressed', on ? 'true' : 'false');
                b.setAttribute('aria-label', on ? 'Remove from wishlist' : 'Add to wishlist');
            });
            var n = wish.filter(function (s) { return catalogue[s]; }).length;
            badge.textContent = n ? String(n) : '';
            renderList();
        }

        // hearts on every product card
        $$('.product-card').forEach(function (card) {
            var t = $('.product-title', card);
            var sku = skuOf(t && t.textContent);
            if (!sku) return;
            if (window.getComputedStyle(card).position === 'static') card.style.position = 'relative';
            var b = document.createElement('button');
            b.type = 'button'; b.className = 'sf-wish-btn'; b.setAttribute('data-pid', sku);
            b.innerHTML = HEART;
            b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); toggle(sku); });
            card.appendChild(b);
        });

        link.addEventListener('click', function (e) { e.preventDefault(); open(); });
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
        $('#sfWishClose', overlay).addEventListener('click', close);
        sync();
    }

    /* ======================= COOKIE CONSENT ======================= */
    function initCookies() {
        var KEY = 'discrete_cookie_consent';
        var banner = mount(
            '<div class="sf-cookie" id="sfCookieBanner" role="dialog" aria-label="Cookie consent" hidden>' +
            '<p>We use cookies to keep the studio running and to understand how the site is used. Choose what you\'re happy with. <a href="privacy.html">Privacy Policy</a></p>' +
            '<div class="sf-cookie-actions">' +
            '<button type="button" id="sfCookieReject">Reject non-essential</button>' +
            '<button type="button" id="sfCookieSettings">Settings</button>' +
            '<button type="button" id="sfCookieAccept" class="primary">Accept all</button></div></div>');
        var modal = mount(
            '<div class="sf-cookie-modal" id="sfCookieModal" aria-hidden="true">' +
            '<div class="sf-cookie-panel" role="dialog" aria-modal="true" aria-label="Cookie settings">' +
            '<h4>COOKIE SETTINGS</h4><p>Pick which cookies DISCRETE may use. You can change this any time from the footer.</p>' +
            '<div class="sf-cookie-row"><div><strong>ESSENTIAL</strong><span>Cart, checkout and security. Always on.</span></div><input type="checkbox" checked disabled aria-label="Essential cookies (always on)"></div>' +
            '<div class="sf-cookie-row"><div><strong>ANALYTICS</strong><span>Helps us understand which pages and products people use.</span></div><input type="checkbox" id="sfCookieAnalytics" aria-label="Analytics cookies"></div>' +
            '<div class="sf-cookie-row"><div><strong>MARKETING</strong><span>Used to show relevant offers on other platforms.</span></div><input type="checkbox" id="sfCookieMarketing" aria-label="Marketing cookies"></div>' +
            '<div class="sf-cookie-panel-actions"><button type="button" class="sf-cbtn" id="sfCookieSave">Save choices</button>' +
            '<button type="button" class="sf-cbtn primary" id="sfCookieAcceptAll">Accept all</button></div></div></div>');
        var optA = $('#sfCookieAnalytics', modal), optM = $('#sfCookieMarketing', modal);

        function read() { try { return JSON.parse(store.get(KEY)); } catch (e) { return null; } }
        function broadcast(c) { document.dispatchEvent(new CustomEvent('cookieconsent', { detail: c })); }
        function saveConsent(a, m) {
            var c = { essential: true, analytics: !!a, marketing: !!m, savedAt: new Date().toISOString() };
            store.set(KEY, JSON.stringify(c));
            broadcast(c);                          // analytics / pixels should wait for this event
            banner.hidden = true;
            closeModal();
        }
        function openModal() {
            var c = read() || {};
            optA.checked = !!c.analytics; optM.checked = !!c.marketing;
            modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false');
        }
        function closeModal() {
            modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true');
            if (location.hash === '#cookies') history.replaceState(null, '', location.pathname + location.search);
        }
        window.addEventListener('discrete:escape', closeModal);
        window.DISCRETE = window.DISCRETE || {};
        window.DISCRETE.openCookieSettings = openModal;

        var existing = read();
        if (!existing) {
            // pages with the loading screen wait for it to finish before interrupting
            setTimeout(function () { banner.hidden = false; }, document.getElementById('pageLoader') ? 1800 : 600);
        } else {
            broadcast(existing);
        }
        if (location.hash === '#cookies') setTimeout(openModal, 0);

        $('#sfCookieAccept', banner).addEventListener('click', function () { saveConsent(true, true); });
        $('#sfCookieReject', banner).addEventListener('click', function () { saveConsent(false, false); });
        $('#sfCookieSettings', banner).addEventListener('click', openModal);
        $('#sfCookieSave', modal).addEventListener('click', function () { saveConsent(optA.checked, optM.checked); });
        $('#sfCookieAcceptAll', modal).addEventListener('click', function () { saveConsent(true, true); });
        modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });

        // any footer "Cookie Settings" link opens the panel right here (falls back to index.html#cookies without JS)
        document.addEventListener('click', function (e) {
            var a = e.target.closest && e.target.closest('[data-cookie-settings], a[href$="#cookies"]');
            if (a) { e.preventDefault(); openModal(); }
        });
    }

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') window.dispatchEvent(new Event('discrete:escape'));
    });

    initCookies();
    initWishlist();
})();