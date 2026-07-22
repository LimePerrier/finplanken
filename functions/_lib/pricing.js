// ============================================================
//  Pricing catalog + Canadian sales tax
//  Single source of truth for what checkout is allowed to charge.
//  The browser never dictates the price; it only names a tier/plan
//  and a province, and the server looks the numbers up here.
// ============================================================

// Prices in cents (GST/HST added on top — the fees page quotes
// pre-tax amounts). Retainer amounts bill every six months.
export const TIERS = {
  foundation: {
    key: "foundation",
    name: "Foundation Planning",
    retainerCents: 210000, // $2,100 / semi-annual
    planOnlyCents: 450000, // $4,500 one-time
  },
  integrated: {
    key: "integrated",
    name: "Integrated Wealth Planning",
    retainerCents: 270000, // $2,700 / semi-annual
    planOnlyCents: 570000, // $5,700 one-time
  },
  private: {
    key: "private",
    name: "Private Client Planning",
    retainerCents: 330000, // $3,300 / semi-annual
    planOnlyCents: 690000, // $6,900 one-time
  },
};

export const PLAN_TYPES = {
  retainer: {
    key: "retainer",
    label: "Semi-annual retainer",
    // bi-annual == every 6 months. Helcim expresses this as a
    // monthly billing period with a 6-period increment.
    billingPeriod: "monthly",
    billingPeriodIncrements: 6,
    recurring: true,
  },
  plan_only: {
    key: "plan_only",
    label: "One-time financial plan",
    recurring: false,
  },
};

// GST/HST rate in basis points by province, per place-of-supply
// rules for services (rate follows the client's province). Verify
// against your CRA registration obligations before go-live.
export const PROVINCE_TAX = {
  AB: { name: "Alberta", bps: 500 },                    // 5% GST
  BC: { name: "British Columbia", bps: 500 },           // 5% GST (PST n/a to services)
  MB: { name: "Manitoba", bps: 500 },                   // 5% GST
  NB: { name: "New Brunswick", bps: 1500 },             // 15% HST
  NL: { name: "Newfoundland and Labrador", bps: 1500 }, // 15% HST
  NS: { name: "Nova Scotia", bps: 1400 },               // 14% HST (as of Apr 2025)
  NT: { name: "Northwest Territories", bps: 500 },      // 5% GST
  NU: { name: "Nunavut", bps: 500 },                    // 5% GST
  ON: { name: "Ontario", bps: 1300 },                   // 13% HST
  PE: { name: "Prince Edward Island", bps: 1500 },      // 15% HST
  QC: { name: "Quebec", bps: 500 },                     // 5% GST (QST handled separately)
  SK: { name: "Saskatchewan", bps: 500 },               // 5% GST
  YT: { name: "Yukon", bps: 500 },                      // 5% GST
};

// Private, ad-hoc discount codes for grandfathered or negotiated pricing.
// A code overrides the base (pre-tax) fee; GST/HST is still added on top,
// and the browser can never set its own price — only a known code applies.
// Keys are matched case-insensitively. Add a code here to hand a client a
// custom rate; remove it to retire it.
export const DISCOUNT_CODES = {
  // Grandfathered client at $2,500 semi-annual + GST/HST ($5,000/yr pre-tax).
  LEGACY2500: {
    label: "Grandfathered rate",
    planType: "retainer",        // valid for the semi-annual retainer only
    overrideBaseCents: 250000,   // $2,500.00 per semi-annual period, pre-tax
  },
};

export function findDiscountCode(code) {
  if (!code) return null;
  const key = String(code).trim().toUpperCase();
  if (!key) return null;
  return Object.prototype.hasOwnProperty.call(DISCOUNT_CODES, key)
    ? { key, ...DISCOUNT_CODES[key] }
    : null;
}

export function isValidTier(tier) {
  return Object.prototype.hasOwnProperty.call(TIERS, tier);
}

export function isValidPlanType(planType) {
  return Object.prototype.hasOwnProperty.call(PLAN_TYPES, planType);
}

export function isValidProvince(province) {
  return Object.prototype.hasOwnProperty.call(PROVINCE_TAX, province);
}

// Returns the authoritative money breakdown for a selection, or
// throws if any input is invalid. All values in cents. An optional
// discount code overrides the base fee (GST/HST is still applied).
export function quote({ tier, planType, province, code }) {
  if (!isValidTier(tier)) throw new Error("Unknown planning tier.");
  if (!isValidPlanType(planType)) throw new Error("Unknown plan type.");
  if (!isValidProvince(province)) throw new Error("Please select your province.");

  const tierDef = TIERS[tier];
  let baseCents = planType === "retainer" ? tierDef.retainerCents : tierDef.planOnlyCents;
  const listBaseCents = baseCents;

  let discount = null;
  if (code) {
    const dc = findDiscountCode(code);
    if (!dc) throw new Error("That discount code isn’t valid.");
    if (dc.planType && dc.planType !== planType) {
      throw new Error("That discount code doesn’t apply to this option.");
    }
    if (dc.tier && dc.tier !== tier) {
      throw new Error("That discount code doesn’t apply to this plan.");
    }
    if (typeof dc.overrideBaseCents === "number") baseCents = dc.overrideBaseCents;
    discount = { code: dc.key, label: dc.label || "Discount applied" };
  }

  const taxBps = PROVINCE_TAX[province].bps;
  const taxCents = Math.round((baseCents * taxBps) / 10000);

  return {
    tier,
    tierName: tierDef.name,
    planType,
    planLabel: PLAN_TYPES[planType].label,
    recurring: PLAN_TYPES[planType].recurring,
    province,
    provinceName: PROVINCE_TAX[province].name,
    baseAmountCents: baseCents,
    listBaseCents,
    taxRateBps: taxBps,
    taxAmountCents: taxCents,
    totalAmountCents: baseCents + taxCents,
    currency: "CAD",
    discount,
  };
}

// Helcim wants a plain decimal number, not cents.
export function centsToAmount(cents) {
  return Math.round(cents) / 100;
}

export function formatCad(cents) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
  }).format(cents / 100);
}
