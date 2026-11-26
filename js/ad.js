/* js/ad.js - the one-day advert pop-up ("Websites from R350").
   The words and the dates live on the server (lib/ad.js, served by /api/ad) and the SERVER clock decides if it is on.
   Outside the day it does nothing. It shows once per visit; closing it hides it until the visitor's next visit. */
(function () {
    'use strict';
    if (!window.fetch) return;
    var KEY = 'dscAdSeen';
    try { if (sessionStorage.getItem(KEY)) return; } catch (e) { /* storage blocked: it may show on every page */ }

    fetch('/api/ad', { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (a) { if (a && a.active) setTimeout(function () { open(a); }, 2600); })   // wait for the page loader and cookie bar
        .catch(function () { /* no ad: nothing happens */ });

    function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

    function open(a) {
        if (document.querySelector('.dsc-ad-overlay')) return;
        var digits = String(a.phoneIntl || '').replace(/\D/g, '');
        if (!digits) return;
        var before = document.activeElement;
        var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/css/ad.css';

        var overlay = el('div', 'dsc-ad-overlay');
        var box = el('div', 'dsc-ad'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-labelledby', 'dscAdTitle');
        var close = el('button', 'dsc-ad-close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Close this advert');
        var head = el('h2', 'dsc-ad-head'); head.id = 'dscAdTitle';
        var parts = String(a.headline || '').split(/(R\d+)/);                       // the price is picked out in yellow
        parts.forEach(function (p) { if (/^R\d+$/.test(p)) head.appendChild(el('em', '', p)); else if (p) head.appendChild(document.createTextNode(p)); });

        var actions = el('div', 'dsc-ad-actions');
        var wa = el('a', 'dsc-ad-btn dsc-ad-btn--primary', 'WhatsApp ' + (a.name ? a.name.split(' ')[0] : 'me'));
        wa.href = 'https://wa.me/' + digits + '?text=' + encodeURIComponent(a.whatsappText || ''); wa.target = '_blank'; wa.rel = 'noopener';
        var call = el('a', 'dsc-ad-btn dsc-ad-btn--ghost', 'Call ' + (a.phoneDisplay || ('+' + digits))); call.href = 'tel:+' + digits;
        actions.appendChild(wa); actions.appendChild(call);

        box.appendChild(el('span', 'dsc-ad-tag', a.tag || 'ADVERT'));
        box.appendChild(close);
        box.appendChild(el('p', 'dsc-ad-kicker', a.kicker || ''));
        box.appendChild(head);
        box.appendChild(el('p', 'dsc-ad-lead', a.lead || ''));
        box.appendChild(el('p', 'dsc-ad-body', a.body || ''));
        box.appendChild(actions);
        if (a.fine) box.appendChild(el('p', 'dsc-ad-fine', a.fine));
        overlay.appendChild(box);

        var shown = false;
        function show() {
            if (shown) return; shown = true;
            document.body.appendChild(overlay);
            try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* storage blocked */ }
            var prevOverflow = document.documentElement.style.overflow;
            document.documentElement.style.overflow = 'hidden';                       // page behind does not scroll
            close.focus();
            function done() {
                document.documentElement.style.overflow = prevOverflow;
                document.removeEventListener('keydown', onKey);
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                if (before && before.focus) { try { before.focus(); } catch (e) { /* ignore */ } }
            }
            function onKey(e) {
                if (e.key === 'Escape') { done(); return; }
                if (e.key !== 'Tab') return;                                          // keep keyboard focus inside the advert
                var f = box.querySelectorAll('button, a[href]'); if (!f.length) return;
                var first = f[0], last = f[f.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
            document.addEventListener('keydown', onKey);
            close.addEventListener('click', done);
            overlay.addEventListener('click', function (e) { if (e.target === overlay) done(); });
        }
        css.onload = show; css.onerror = show;                                        // show once the styles are ready (or if they fail)
        setTimeout(show, 1500);
        document.head.appendChild(css);
    }
})();
