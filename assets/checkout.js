/* ============================================================
   Bracket Planning - checkout flow controller
   Talks to /api/checkout/* and drives the HelcimPay.js modal.
   ============================================================ */
(function () {
  "use strict";

  var TIERS = {
    foundation: { name: "Foundation Planning", retainer: "$2,100", planOnly: "$4,500",
      blurb: "For people earlier in their career or business journey." },
    integrated: { name: "Integrated Wealth Planning", retainer: "$2,700", planOnly: "$5,700",
      blurb: "For mid-career professionals whose decisions now work together." },
    private: { name: "Private Client Planning", retainer: "$3,300", planOnly: "$6,900",
      blurb: "For later-career transitions, retirement income and legacy." }
  };

  // Payment methods offered. When true, checkout skips the credit/debit
  // choice and goes straight to pre-authorized debit; when false, the client
  // chooses credit card or debit. Both paths are fully supported.
  var PAD_ONLY = false;

  var $ = function (id) { return document.getElementById(id); };
  var state = {
    tier: "integrated",
    planType: "retainer",
    intentId: null,
    accessToken: null,
    quote: null,
    engagementDoc: null,
    padDoc: null,
    method: null,
    engagementSigned: false,
    padSigned: false
  };

  /* ---------- init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var y = $("year"); if (y) y.textContent = new Date().getFullYear();

    var params = new URLSearchParams(location.search);
    var t = (params.get("tier") || "").toLowerCase();
    if (TIERS[t]) state.tier = t;
    var plan = (params.get("plan") || "").toLowerCase();
    if (plan === "plan_only" || plan === "planonly" || plan === "plan-only") state.planType = "plan_only";

    // Optional discount code from the link, pre-filled into the details form.
    var code = (params.get("code") || "").trim();
    if (code) { var cf = $("f-code"); if (cf) cf.value = code; }

    renderTierSelect();
    var pt = document.querySelector('input[name="plantype"][value="' + state.planType + '"]');
    if (pt) pt.checked = true;

    document.querySelectorAll('input[name="plantype"]').forEach(function (r) {
      r.addEventListener("change", function () { state.planType = r.value; renderTierSelect(); syncSummary(); });
    });

    document.querySelectorAll("[data-next]").forEach(function (b) {
      b.addEventListener("click", function () { goStep(parseInt(b.getAttribute("data-next"), 10)); });
    });
    document.querySelectorAll("[data-prev]").forEach(function (b) {
      b.addEventListener("click", function () { goStep(parseInt(b.getAttribute("data-prev"), 10)); });
    });

    $("details-form").addEventListener("submit", submitDetails);
    $("eng-form").addEventListener("submit", signEngagement);
    document.querySelectorAll(".co-method-card").forEach(function (c) {
      c.addEventListener("click", function () { chooseMethod(c.getAttribute("data-method")); });
    });
    $("to-pay").addEventListener("click", proceedToPay);
    $("open-pay").addEventListener("click", startPayment);

    syncSummary();
  });

  /* ---------- step 1: plan ---------- */
  function renderTierSelect() {
    var wrap = $("tier-select");
    wrap.innerHTML = "";
    Object.keys(TIERS).forEach(function (key) {
      var t = TIERS[key];
      var price = state.planType === "retainer" ? t.retainer : t.planOnly;
      var cadence = state.planType === "retainer" ? "/ semi-annual" : "one-time";
      var card = document.createElement("button");
      card.type = "button";
      card.className = "co-tier-card" + (key === state.tier ? " active" : "");
      card.innerHTML =
        '<div class="co-tier-name">' + t.name + "</div>" +
        '<div class="co-tier-price">' + price + ' <small>' + cadence + "</small></div>" +
        '<div class="co-tier-blurb">' + t.blurb + "</div>";
      card.addEventListener("click", function () {
        state.tier = key; renderTierSelect(); syncSummary();
      });
      wrap.appendChild(card);
    });
  }

  /* ---------- summary ---------- */
  function syncSummary() {
    var t = TIERS[state.tier];
    $("sum-tier").textContent = t.name;
    var recurring = state.planType === "retainer";
    $("sum-plan-label").textContent = "Billing";
    $("sum-plan").textContent = recurring ? "Every 6 months" : "One-time";
    $("sum-total-label").textContent = recurring ? "Due today (then every 6 mo.)" : "Total due";

    if (state.quote) {
      $("sum-base").textContent = state.quote.baseAmount;
      $("sum-tax-label").textContent = "GST/HST (" + state.quote.taxRatePct + "%)";
      $("sum-tax").textContent = state.quote.taxAmount;
      $("sum-total").textContent = state.quote.totalAmount;
      $("sum-note").textContent = recurring
        ? "Billed automatically every six months until cancelled. The first two payments are required."
        : "A single payment for your comprehensive plan.";
      // Show the discount row and struck-through list price when a code applied.
      if (state.quote.discountLabel) {
        $("sum-discount-row").hidden = false;
        $("sum-discount-label").textContent = state.quote.discountLabel;
        $("sum-discount").textContent = state.quote.listAmount
          ? "was " + state.quote.listAmount
          : "applied";
      } else {
        $("sum-discount-row").hidden = true;
      }
    } else {
      $("sum-base").textContent = recurring ? t.retainer : t.planOnly;
      $("sum-tax").textContent = "—";
      $("sum-total").textContent = "—";
      $("sum-discount-row").hidden = true;
    }
  }

  /* ---------- navigation ---------- */
  function goStep(n) {
    for (var i = 1; i <= 5; i++) {
      var p = $("panel-" + i);
      if (p) p.hidden = (i !== n);
    }
    $("panel-done").hidden = true;
    document.querySelectorAll("#stepbar li").forEach(function (li) {
      var s = parseInt(li.getAttribute("data-step"), 10);
      li.classList.toggle("done", s < n);
      li.classList.toggle("current", s === n);
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function showDone() {
    for (var i = 1; i <= 5; i++) { var p = $("panel-" + i); if (p) p.hidden = true; }
    $("panel-done").hidden = false;
    document.querySelectorAll("#stepbar li").forEach(function (li) { li.classList.add("done"); li.classList.remove("current"); });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setStatus(id, msg, ok) {
    var el = $(id);
    el.textContent = msg || "";
    el.className = "co-status" + (msg ? (ok ? " ok" : " err") : "");
  }

  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.textContent; btn.disabled = true; btn.textContent = label || "Working…"; }
    else { btn.disabled = false; if (btn.dataset.label) btn.textContent = btn.dataset.label; }
  }

  function api(path, body) {
    return fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok) throw new Error(data.error || "Something went wrong. Please try again.");
        return data;
      });
    });
  }

  /* ---------- step 2: details -> create intent ---------- */
  function submitDetails(e) {
    e.preventDefault();
    var name = $("f-name").value.trim();
    var email = $("f-email").value.trim();
    var province = $("f-province").value;
    var codeEl = $("f-code");
    var code = codeEl ? codeEl.value.trim() : "";
    if (!name) return setStatus("details-status", "Please enter your name.");
    if (!email) return setStatus("details-status", "Please enter your email.");
    if (!province) return setStatus("details-status", "Please select your province.");
    setStatus("details-status", "");
    var btn = $("details-submit");
    busy(btn, true, "Calculating…");

    api("/api/checkout/intent", {
      tier: state.tier, planType: state.planType, province: province, name: name, email: email, code: code
    }).then(function (data) {
      state.intentId = data.intentId;
      state.accessToken = data.accessToken;
      state.quote = data.quote;
      state.engagementDoc = data.engagementDoc;
      state.padDoc = data.padDoc;
      // A fresh intent invalidates any earlier signatures.
      state.engagementSigned = false; state.padSigned = false; state.method = null;
      syncSummary();
      renderLegal("eng-body", "eng-title", state.engagementDoc);
      busy(btn, false);
      goStep(3);
    }).catch(function (err) {
      busy(btn, false);
      setStatus("details-status", err.message);
    });
  }

  /* ---------- legal rendering ---------- */
  function renderLegal(bodyId, titleId, doc) {
    if (titleId && doc.title) $(titleId).textContent = doc.title;
    var html = "";
    doc.blocks.forEach(function (b) {
      html += "<h4>" + escapeHtml(b.heading) + "</h4>" + renderLegalBody(b.body);
    });
    html += '<p class="co-legal-ver">Version ' + escapeHtml(doc.version) + "</p>";
    $(bodyId).innerHTML = html;
  }

  // A blank line separates paragraphs; a run of lines beginning with "- "
  // becomes a bulleted list.
  function renderLegalBody(body) {
    return String(body).split(/\n{2,}/).map(function (part) {
      var lines = part.split(/\n/);
      var allBullets = lines.length > 0 && lines.every(function (l) { return /^\s*-\s+/.test(l); });
      if (allBullets) {
        return "<ul>" + lines.map(function (l) {
          return "<li>" + escapeHtml(l.replace(/^\s*-\s+/, "")) + "</li>";
        }).join("") + "</ul>";
      }
      return "<p>" + escapeHtml(part) + "</p>";
    }).join("");
  }

  /* ---------- step 3: sign engagement letter ---------- */
  function signEngagement(e) {
    e.preventDefault();
    if (!$("eng-agree").checked) return setStatus("eng-status", "Please confirm you agree to continue.");
    var signer = $("eng-sign").value.trim();
    if (signer.length < 2) return setStatus("eng-status", "Please type your full name to sign.");
    setStatus("eng-status", "");
    var btn = $("eng-submit");
    busy(btn, true, "Signing…");

    api("/api/checkout/sign", {
      intentId: state.intentId, accessToken: state.accessToken,
      agreementType: "engagement_letter", signerName: signer
    }).then(function () {
      state.engagementSigned = true;
      busy(btn, false);
      if (PAD_ONLY) { setupPadOnlyStep(); } else { resetMethodStep(); }
      goStep(4);
    }).catch(function (err) {
      busy(btn, false);
      setStatus("eng-status", err.message);
    });
  }

  /* ---------- step 4: PAD-only (skip method choice) ---------- */
  function setupPadOnlyStep() {
    state.method = "ach";
    state.padSigned = false;
    // .co-method sets display:grid, which overrides the [hidden] attribute,
    // so hide it explicitly with display:none.
    var methodEl = document.querySelector(".co-method");
    if (methodEl) methodEl.style.display = "none";
    var heading = document.querySelector("#panel-4 h2");
    if (heading) heading.textContent = "Set up pre-authorized debit";
    renderLegal("pad-body", "pad-title", state.padDoc);
    $("pad-block").hidden = false;
    $("to-pay").hidden = false;
    $("to-pay").textContent = "Sign & continue to payment";
    setStatus("method-status", "");
  }

  /* ---------- step 4: payment method + PAD (credit enabled) ---------- */
  function resetMethodStep() {
    state.method = null; state.padSigned = false;
    document.querySelectorAll(".co-method-card").forEach(function (c) { c.classList.remove("active"); });
    $("pad-block").hidden = true;
    $("to-pay").hidden = true;
    setStatus("method-status", "");
  }

  function chooseMethod(m) {
    state.method = m;
    document.querySelectorAll(".co-method-card").forEach(function (c) {
      c.classList.toggle("active", c.getAttribute("data-method") === m);
    });
    if (m === "ach") {
      renderLegal("pad-body", "pad-title", state.padDoc);
      $("pad-block").hidden = false;
      $("to-pay").hidden = false;
      $("to-pay").textContent = "Sign PAD & continue to payment";
    } else {
      $("pad-block").hidden = true;
      $("to-pay").hidden = false;
      $("to-pay").textContent = "Continue to payment";
    }
    setStatus("method-status", "");
  }

  function proceedToPay() {
    if (!state.method) return setStatus("method-status", "Please choose credit or debit.");
    var btn = $("to-pay");

    if (state.method === "ach" && !state.padSigned) {
      if (!$("pad-agree").checked) return setStatus("pad-status", "Please accept the PAD agreement to continue.");
      var signer = $("pad-sign").value.trim();
      if (signer.length < 2) return setStatus("pad-status", "Please type your full name to sign.");
      setStatus("pad-status", "");
      busy(btn, true, "Signing…");
      api("/api/checkout/sign", {
        intentId: state.intentId, accessToken: state.accessToken,
        agreementType: "pad", signerName: signer
      }).then(function () {
        state.padSigned = true;
        busy(btn, false);
        goStep(5);
        startPayment();
      }).catch(function (err) {
        busy(btn, false);
        setStatus("pad-status", err.message);
      });
      return;
    }

    goStep(5);
    startPayment();
  }

  /* ---------- step 5: HelcimPay.js ---------- */
  function startPayment() {
    setStatus("pay-status", "");
    $("open-pay").hidden = true;
    $("pay-loading").hidden = false;
    $("pay-loading").textContent = "Opening secure payment…";

    api("/api/checkout/session", {
      intentId: state.intentId, accessToken: state.accessToken, paymentMethod: state.method
    }).then(function (data) {
      openHelcim(data.checkoutToken);
    }).catch(function (err) {
      $("pay-loading").hidden = true;
      setStatus("pay-status", err.message);
    });
  }

  function openHelcim(checkoutToken) {
    if (typeof appendHelcimPayIframe !== "function") {
      $("pay-loading").hidden = true;
      setStatus("pay-status", "The secure payment library didn't load. Please refresh and try again.");
      return;
    }
    $("pay-loading").textContent = "A secure payment window has opened. Complete your payment there.";

    var handler = function (event) {
      var idKey = "helcim-pay-js-" + checkoutToken;
      if (!event.data || event.data.eventName !== idKey) return;

      if (event.data.eventStatus === "ABORTED") {
        window.removeEventListener("message", handler);
        removeHelcimIframeSafe();
        $("pay-loading").hidden = true;
        $("open-pay").hidden = false;
        setStatus("pay-status", "Payment was cancelled. You can reopen the payment window when ready.");
        return;
      }

      if (event.data.eventStatus === "SUCCESS") {
        window.removeEventListener("message", handler);
        removeHelcimIframeSafe();
        var parsed = parseHelcimMessage(event.data.eventMessage);
        $("pay-loading").textContent = "Confirming your payment…";
        api("/api/checkout/complete", {
          intentId: state.intentId, accessToken: state.accessToken,
          transaction: parsed.transaction, hash: parsed.hash
        }).then(function (res) {
          $("pay-loading").hidden = true;
          finishDone(res);
        }).catch(function (err) {
          $("pay-loading").hidden = true;
          setStatus("pay-status", err.message);
        });
      }
    };

    window.addEventListener("message", handler);
    appendHelcimPayIframe(checkoutToken);
  }

  // Helcim wraps the transaction differently across flows; normalize it.
  function parseHelcimMessage(message) {
    var msg = message;
    if (typeof msg === "string") { try { msg = JSON.parse(msg); } catch (e) { msg = {}; } }
    // Common shape: { data: { data: {transaction}, hash } }
    var container = msg && msg.data ? msg.data : msg;
    var hash = (container && container.hash) || (msg && msg.hash) || null;
    var transaction = container && container.data && typeof container.data === "object"
      ? container.data
      : container;
    return { transaction: transaction || {}, hash: hash };
  }

  function removeHelcimIframeSafe() {
    try { if (typeof removeHelcimPayIframe === "function") removeHelcimPayIframe(); } catch (e) {}
  }

  function finishDone(res) {
    var msg = res.recurring
      ? "Your semi-annual retainer is active. " + (res.amountPaid ? res.amountPaid + " was processed and your next payment is in six months." : "")
      : "Your payment of " + (res.amountPaid || "") + " was received.";
    $("done-msg").textContent = msg.trim();
    if (res.setupUrl) {
      $("done-setup").hidden = false;
      $("done-setup-link").href = res.setupUrl;
      var note = document.getElementById("done-setup-note");
      if (note) {
        note.textContent = res.inviteEmailed
          ? "We've emailed you a link to finish setting up your client portal. You can also set it up right now:"
          : "Finish creating your client portal so you can view your plan and documents:";
      }
    }
    showDone();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
})();
