/* Shared site behaviour: mobile nav toggle + footer year */
(function () {
  function init() {
    var toggle = document.querySelector('.nav-toggle');
    var menu = document.querySelector('.menu');
    if (toggle && menu) {
      var backdrop = document.createElement('div');
      backdrop.className = 'nav-backdrop';
      document.body.appendChild(backdrop);
      function close() { menu.classList.remove('open'); backdrop.classList.remove('show'); toggle.setAttribute('aria-expanded', 'false'); }
      function open() { menu.classList.add('open'); backdrop.classList.add('show'); toggle.setAttribute('aria-expanded', 'true'); }
      toggle.addEventListener('click', function () {
        menu.classList.contains('open') ? close() : open();
      });
      backdrop.addEventListener('click', close);
      menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', close); });
      window.addEventListener('resize', function () { if (window.innerWidth > 980) close(); });
    }
    var yr = document.getElementById('year');
    if (yr) yr.textContent = new Date().getFullYear();

    var form = document.getElementById('contact-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var note = document.getElementById('form-status');
        if (note) note.textContent = 'Thank you — this is a design mockup, so the form isn’t connected yet. Please email us directly to get in touch.';
      });
    }

    // Fee-only vs 1.5% AUM calculator
    var amt = document.getElementById('in-amt');
    if (amt) {
      var yrsEl = document.getElementById('in-yrs');
      var GROWTH = 0.05, AUM = 0.015, FLAT = 4200;
      var money = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
      var calc = function () {
        var P = +amt.value, N = +yrsEl.value;
        var bAum = P, bFlat = P, paidAum = 0, paidFlat = 0;
        for (var i = 0; i < N; i++) {
          bAum = bAum * (1 + GROWTH); var f = bAum * AUM; bAum -= f; paidAum += f;
          bFlat = bFlat * (1 + GROWTH); bFlat -= FLAT; paidFlat += FLAT;
        }
        document.getElementById('calc-amt').textContent = money(P);
        document.getElementById('calc-yrs').textContent = N + ' years';
        document.getElementById('calc-yrs2').textContent = N;
        document.getElementById('calc-diff').textContent = money(bFlat - bAum);
        document.getElementById('calc-end-aum').textContent = money(bAum);
        document.getElementById('calc-end-flat').textContent = money(bFlat);
        document.getElementById('calc-aum').textContent = money(paidAum);
        document.getElementById('calc-flat').textContent = money(paidFlat);
      };
      amt.addEventListener('input', calc);
      yrsEl.addEventListener('input', calc);
      calc();
    }

    // Affiliations: enhance the static grid into a two-row auto-scrolling marquee
    var affil = document.querySelector('.affil');
    if (affil) {
      var cells = Array.prototype.slice.call(affil.querySelectorAll('.logo-cell'));
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (cells.length > 6 && !reduce) {
        var half = Math.ceil(cells.length / 2);
        var rows = [cells.slice(0, half), cells.slice(half)];
        var wrap = document.createElement('div');
        wrap.className = 'logo-marquee';
        rows.forEach(function (items, idx) {
          var row = document.createElement('div');
          row.className = 'marquee-row';
          var track = document.createElement('div');
          track.className = 'marquee-track' + (idx === 1 ? ' rev' : '');
          items.concat(items).forEach(function (c, i) {
            var n = c.cloneNode(true);
            if (i >= items.length) n.setAttribute('aria-hidden', 'true');
            track.appendChild(n);
          });
          row.appendChild(track);
          wrap.appendChild(row);
        });
        affil.parentNode.replaceChild(wrap, affil);
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

