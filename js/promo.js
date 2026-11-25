/* js/promo.js - Black Friday theme + sale display.
   The dates and the percentage live on the server (lib/promo.js, served by /api/promo), and the server
   alone decides what customers pay. This file only changes how the pages LOOK, and only while the sale
   is on. When the time is up it does nothing, so the shop is back to normal by itself. */
(function () {
    'use strict';
    var KEY = 'bfPromoCfg', RELOAD = 'bfPromoReload';
    var cfg = null, offset = 0, shown = null, timer = null;

    var t = function (s) { return new Date(s).getTime(); };
    var now = function () { return Date.now() + offset; };
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var money = function (n) { return 'R' + (Math.abs(n - Math.round(n)) < 0.005 ? String(Math.round(n)) : n.toFixed(2)); };

    function status() {
        if (!cfg) return { theme: false, sale: false };
        var n = now();
        return { theme: n >= t(cfg.themeStart) && n < t(cfg.themeEnd), sale: n >= t(cfg.saleStart) && n < t(cfg.saleEnd) };
    }
    function unit(p) { return Math.round(p * 100 * (100 - cfg.percent) / 100) / 100; }   // same rounding as the server
    function countdown(ms) {
        var s = Math.max(0, Math.floor(ms / 1000));
        var d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
        return (d ? d + 'D ' : '') + pad(h) + 'H ' + pad(m) + 'M ' + pad(x) + 'S';
    }

    // The scrolling bar is two identical strips that slide sideways. Each strip only needs to be as wide as the
    // screen: a phone needs ONE copy of the message, a wide laptop needs three. (Making it wider than that is
    // what made the bar go blank on iPhones: very wide moving strips are not drawn properly there.)
    var lineHtml = '';
    function fitBar() {
        var bar = document.querySelector('.announcement-bar');
        var track = bar && bar.querySelector('.marquee-track');
        var ps = track ? track.querySelectorAll('p') : [];
        if (!lineHtml || ps.length < 2) return;
        ps.forEach(function (p) { p.innerHTML = lineHtml; });
        var one = ps[0].getBoundingClientRect().width;               // width of a single copy (0 if the browser cannot measure)
        var n = one > 0 ? Math.max(1, Math.min(8, Math.ceil((bar.clientWidth + 40) / one))) : 3;
        if (n > 1) { var html = new Array(n + 1).join(lineHtml); ps.forEach(function (p) { p.innerHTML = html; }); }
        var strip = ps[0].getBoundingClientRect().width;
        if (strip > 0) track.style.animationDuration = Math.max(8, Math.round(strip / 70)) + 's';   // about 70px a second on every screen
    }

    function banner(st) {
        var pct = Number(cfg.percent) + '%';
        var parts = st.sale
            ? ['BLACK FRIDAY IS LIVE', pct + ' OFF EVERYTHING', 'TODAY ONLY', 'DELIVERY VIA PEP PAXI']
            : ['BLACK FRIDAY', pct + ' OFF EVERYTHING', esc(cfg.saleLabel) + ' ONLY', 'DELIVERY VIA PEP PAXI'];
        lineHtml = parts.join(' &nbsp;|&nbsp; ') + ' &nbsp;|&nbsp; ';
        fitBar();
        if (!banner.wired) {
            banner.wired = true;
            var t0; window.addEventListener('resize', function () { clearTimeout(t0); t0 = setTimeout(fitBar, 200); });   // rotate the phone, resize the window
            if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitBar);                                   // text is wider once the real font loads
        }
    }

    function hero(st) {
        var h = document.querySelector('.hero');
        if (!h || h.querySelector('.bf-hero')) return;
        var box = document.createElement('div');
        box.className = 'bf-hero'; box.setAttribute('role', 'note');
        box.innerHTML = '<span class="bf-hero-kicker">BLACK FRIDAY</span><strong>' + Number(cfg.percent) + '% OFF EVERYTHING</strong>' +
            '<span class="bf-hero-when">' + (st.sale ? 'TODAY ONLY' : esc(cfg.saleLabel) + ' ONLY') + '</span><span class="bf-count" id="bfCount"></span>';
        // Put the box right before the title, AFTER the three .hero-bg picture layers: the CSS picks those by
        // position (.hero-bg:nth-child(1..3)), so nothing may be inserted in front of them.
        h.insertBefore(box, h.querySelector('h1') || null);
    }

    function tick() {
        var st = status();
        var sig = st.theme + '|' + st.sale;
        if (shown !== null && sig !== shown) {          // the sale just started or ended while the page was open
            var last = Number(sessionStorage.getItem(RELOAD) || 0);
            if (Date.now() - last > 20000) { try { sessionStorage.setItem(RELOAD, String(Date.now())); } catch (e) {} location.reload(); }
            return;
        }
        var c = document.getElementById('bfCount');
        if (c && cfg) c.textContent = st.sale ? 'ENDS IN ' + countdown(t(cfg.saleEnd) - now()) : 'STARTS IN ' + countdown(t(cfg.saleStart) - now());
    }

    function decorate() {
        var tag = function (el) {
            if (el.getAttribute('data-bf-now')) return;
            var m = /^R\s*(\d+(?:\.\d+)?)$/.exec(el.textContent.trim());
            if (!m) return;
            el.setAttribute('data-bf-now', money(unit(parseFloat(m[1]))));
            el.setAttribute('title', 'Black Friday: ' + cfg.percent + '% off');
        };
        document.querySelectorAll('.product-card .product-price, .sf-na-meta span:last-child').forEach(tag);
        document.querySelectorAll('.product-card .product-image').forEach(function (im) {
            if (im.querySelector('.bf-badge')) return;
            var b = document.createElement('span'); b.className = 'bf-badge'; b.textContent = '-' + cfg.percent + '%'; im.appendChild(b);
        });
    }

    function apply() {
        var st = status();
        shown = st.theme + '|' + st.sale;
        if (!st.theme) return;
        if (!document.getElementById('bfCss')) {
            var l = document.createElement('link'); l.id = 'bfCss'; l.rel = 'stylesheet'; l.href = '/css/blackfriday.css'; document.head.appendChild(l);
        }
        document.body.classList.add('bf-theme');
        var tc = document.querySelector('meta[name="theme-color"]'); if (tc) tc.setAttribute('content', '#ffd400');   // phone status bar matches the yellow bar
        banner(st); hero(st);
        if (st.sale) {
            document.body.classList.add('bf-sale');
            window.BF = { saleActive: true, percent: cfg.percent, unit: unit };
            window.bfPriceHtml = function (price) {
                var m = /^R\s*(\d+(?:\.\d+)?)$/.exec(String(price).trim());
                return m ? '<s>' + esc(price) + '</s><b>' + money(unit(parseFloat(m[1]))) + '</b>' : esc(price);
            };
            decorate();
        }
        tick();
        if (!timer) timer = setInterval(tick, 1000);
    }

    function start() {
        var cached = null;
        try { cached = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) {}
        if (cached && cached.cfg) { cfg = cached.cfg; offset = cached.offset || 0; apply(); }
        if (!window.fetch) return;
        fetch('/api/promo', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
            if (!j || typeof j.now !== 'number') return;
            cfg = j; offset = j.now - Date.now();
            try { sessionStorage.setItem(KEY, JSON.stringify({ cfg: j, offset: offset })); } catch (e) {}
            if (shown === null) apply(); else tick();
        }).catch(function () { /* no promo info: the site simply stays normal */ });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
