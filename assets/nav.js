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

    // Salary vs dividend illustration for incorporated professionals
    var profitEl = document.getElementById('in-comp-profit');
    if (profitEl) {
      var salaryShareEl = document.getElementById('in-comp-salary-share');
      var corpRateEl = document.getElementById('in-comp-corp-rate');
      var salaryTaxEl = document.getElementById('in-comp-salary-tax');
      var dividendTaxEl = document.getElementById('in-comp-div-tax');
      var money = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };
      var pct = function (n) { return Number(n).toFixed(n % 1 ? 1 : 0) + '%'; };
      var compensation = function (profit, salaryShare, corpRate, salaryTax, dividendTax) {
        var salary = profit * salaryShare;
        var corpIncome = Math.max(0, profit - salary);
        var corpTax = corpIncome * corpRate;
        var dividend = Math.max(0, corpIncome - corpTax);
        var netSalary = salary * (1 - salaryTax);
        var netDividend = dividend * (1 - dividendTax);
        return {
          salary: salary,
          corpTax: corpTax,
          netCash: netSalary + netDividend,
          rrspRoom: salary * 0.18
        };
      };
      var calc = function () {
        var profit = +profitEl.value;
        var salaryShare = +salaryShareEl.value / 100;
        var corpRate = +corpRateEl.value / 100;
        var salaryTax = +salaryTaxEl.value / 100;
        var dividendTax = +dividendTaxEl.value / 100;
        var selected = compensation(profit, salaryShare, corpRate, salaryTax, dividendTax);
        var allSalary = compensation(profit, 1, corpRate, salaryTax, dividendTax);
        var allDividend = compensation(profit, 0, corpRate, salaryTax, dividendTax);
        var dividendShare = 100 - +salaryShareEl.value;

        document.getElementById('calc-comp-profit').textContent = money(profit);
        document.getElementById('calc-comp-salary-share').textContent = pct(+salaryShareEl.value);
        document.getElementById('calc-comp-corp-rate').textContent = pct(+corpRateEl.value);
        document.getElementById('calc-comp-salary-tax').textContent = pct(+salaryTaxEl.value);
        document.getElementById('calc-comp-div-tax').textContent = pct(+dividendTaxEl.value);
        document.getElementById('calc-comp-mix').textContent = pct(+salaryShareEl.value) + ' salary / ' + pct(dividendShare) + ' dividends';
        document.getElementById('calc-comp-net').textContent = money(selected.netCash);
        document.getElementById('calc-comp-all-salary').textContent = money(allSalary.netCash);
        document.getElementById('calc-comp-all-dividend').textContent = money(allDividend.netCash);
        document.getElementById('calc-comp-rrsp').textContent = money(selected.rrspRoom);
        document.getElementById('calc-comp-corp-tax').textContent = money(selected.corpTax);
      };
      profitEl.addEventListener('input', calc);
      salaryShareEl.addEventListener('input', calc);
      corpRateEl.addEventListener('input', calc);
      salaryTaxEl.addEventListener('input', calc);
      dividendTaxEl.addEventListener('input', calc);
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
