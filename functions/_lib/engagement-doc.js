// ============================================================
//  Legal documents shown at checkout: the Letter of Engagement
//  and the Pre-Authorized Debit (PAD) agreement.
//
//  Each has a VERSION string. Whenever the wording changes, bump
//  the version — signatures record the version + a content hash so
//  you can always prove exactly what a client agreed to.
//
//  Placeholders in {{double braces}} are filled per checkout.
// ============================================================

export const ENGAGEMENT_LETTER = {
  version: "2026-07-21",
  title: "Letter of Engagement",
  // Kept as an array of blocks so the same source renders identically
  // on the page and hashes deterministically on the server. Within a
  // body, a blank line starts a new paragraph and lines beginning with
  // "- " render as a bulleted list.
  blocks: [
    {
      heading: "Engagement and scope",
      body:
        "This Letter of Engagement is between {{clientName}} (“you”, “the client”) and Bracket Planning, " +
        "operating under Wealth Architects Inc. (“we”, “us”, “the firm”, “the planner”). It sets out the terms under " +
        "which we provide advice-only, comprehensive financial planning. You have selected the {{tierName}} engagement " +
        "on a {{planLabel}} basis.",
    },
    {
      heading: "Advice-only relationship",
      body:
        "We are an independent, advice-only financial planning firm. We do not sell financial products, we do not take " +
        "custody of your assets, and we are not compensated by commissions, referral fees, or third parties. Our only " +
        "compensation is the planning fee described below. We do not hold discretionary trading authority and will not " +
        "execute trades or move funds on your behalf.",
    },
    {
      heading: "Our planning process",
      body:
        "Your engagement includes a comprehensive written financial plan and ongoing planning access. We will: (a) gather " +
        "and review your financial information; (b) analyze your goals across cash flow, tax, investments, retirement, " +
        "insurance, and estate considerations as relevant to your tier; (c) deliver a written plan and recommendations; " +
        "and (d) meet with you twice per year and remain available between meetings for planning questions and modeling. " +
        "Recommendations are educational and are implemented at your discretion, with your other professional advisors.",
    },
    {
      heading: "Fees and billing",
      body:
        "The fee for your selected engagement is {{baseAmount}} plus applicable GST/HST of {{taxAmount}}, for a total of " +
        "{{totalAmount}} ({{provinceName}}). Retainer engagements are billed semi-annually (every six months); the plan-only " +
        "option is a single fee. For retainer engagements, the first two semi-annual payments are required, after which you " +
        "may cancel at any time with written notice before your next billing date. Fees already billed for a completed " +
        "period are non-refundable.",
    },
    {
      heading: "Assumptions",
      body:
        "To ensure that your financial plan provides sound, appropriate advice and good value, the information used to " +
        "prepare it must be complete and accurate. Full disclosure is required, and you are responsible for providing " +
        "complete and accurate information about every aspect of your financial situation. The assumptions used to prepare " +
        "your plan will be listed at the beginning of the plan document.\n\n" +
        "Financial planning is not an exact science, and the future cannot be predicted with certainty. The purpose of " +
        "financial planning is to address your questions and provide guidance on the best way to move forward financially. " +
        "Although it is impossible to create a perfectly accurate financial plan, we strive to project your financial " +
        "future as closely as reasonably possible.\n\n" +
        "Respectfully, we will not attempt to perfect the financial plan through excessive refinement of figures that " +
        "would not affect the plan’s outcome, nor will we analyze or reverse-engineer calculations.",
    },
    {
      heading: "Implementation",
      body:
        "By signing this letter of engagement, you formalize your intent to partner with Bracket Planning to receive " +
        "advice, develop your financial plan, and participate in the related planning process.",
    },
    {
      heading: "Acknowledgements and full disclosure — Licensing",
      body:
        "The planner is licensed in Alberta, British Columbia, and Ontario for life insurance and Accident & Sickness " +
        "insurance, including disability and critical illness insurance. An insurance licence is required to provide " +
        "insurance advice, even when no insurance product is being sold. The planner’s Alberta insurance licence has been " +
        "in good standing since 1996, and the Ontario and British Columbia licences have been in good standing since they " +
        "were obtained in 2021.\n\n" +
        "Investment licensing differs from insurance licensing. The planner was previously licensed for investments but " +
        "has intentionally chosen not to maintain an investment licence. An investment licence must be sponsored by a " +
        "company, which ties the planner to a specific investment company and reduces the planner’s ability to remain " +
        "fully independent. Without an investment licence, the planner cannot make specific investment recommendations " +
        "concerning securities, including stocks and bonds, mutual funds, ETFs, or exempt-market investments. Investment " +
        "recommendations will remain high-level and focus on asset allocation and diversification.",
    },
    {
      heading: "Professional financial designations",
      body:
        "- Certified Financial Planner (CFP) designation, held in good standing with the Financial Planners Standards " +
        "Council of Canada since it was received in 2002.\n" +
        "- Chartered Life Underwriter (CLU) designation, held in good standing with The Institute for Advanced Financial " +
        "Education since it was received in 2005.\n" +
        "- Trust and Estate Practitioner (TEP) designation, held in good standing with the Society of Trust and Estate " +
        "Practitioners since it was received in 2015.",
    },
    {
      heading: "Current industry volunteer positions",
      body:
        "- Estate Planning Council of Canada (epc-canada.org) — appointed to the board.\n" +
        "- Financial Services Regulatory Authority of Ontario (FSRA) — appointed to the Financial Planner/Financial " +
        "Advisor Stakeholder Advisory Committee, representing the Independent Financial Brokers of Canada (IFBC), from " +
        "2024 to the present.",
    },
    {
      heading: "Working with other professionals",
      body:
        "When necessary, we welcome the opportunity to collaborate with other professionals who are already part of your " +
        "financial life, such as your accountant, lawyer, investment advisor, or insurance agent. If you would like one of " +
        "these professionals to confirm information or answer questions, please ask them to email us and copy you on the " +
        "correspondence. Otherwise, we will rely on the information you provide.\n\n" +
        "Your plan will be prepared in consultation with other financial professionals on our team. They are bound by " +
        "confidentiality and by the terms of this agreement.",
    },
    {
      heading: "Conflicts of interest",
      body:
        "We are not aware of any conflicts of interest related to accepting this engagement. You may hire us to assist " +
        "with implementing the recommendations in your financial plan, which may involve purchasing financial products at " +
        "your direction. If a conflict of interest arises, we will disclose it to you in writing.",
    },
    {
      heading: "Confidentiality and privacy",
      body:
        "During our relationship, you will need to provide various types of personal financial information. The planner " +
        "will hold all such information in the strictest confidence. No information about your personal circumstances will " +
        "be shared outside our team with any organization or government agency without your consent, unless disclosure is " +
        "required by law.",
    },
    {
      heading: "Cancellation of engagement",
      body:
        "For retainer engagements you may cancel as described under Fees and billing above; fees already billed for a " +
        "completed period are non-refundable. We also reserve the right to cancel this engagement if it becomes evident " +
        "that we can no longer work together productively.",
    },
    {
      heading: "Conclusion",
      body:
        "We look forward to helping you put a plan in place that clearly maps out your financial future. Please feel free " +
        "to ask questions at any time, including questions or concerns about this letter of engagement or any information " +
        "it contains. We are committed to a mutually beneficial working relationship and to helping you achieve the most " +
        "successful retirement possible.",
    },
    {
      heading: "Authorization",
      body:
        "By typing your name and confirming below, you acknowledge that you have read and agree to this Letter of " +
        "Engagement, and that this electronic signature is legally binding.",
    },
  ],
};

export const PAD_AGREEMENT = {
  version: "2026-07-20",
  title: "Pre-Authorized Debit (PAD) Agreement",
  blocks: [
    {
      heading: "Personal Pre-Authorized Debit agreement",
      body:
        "You, {{clientName}}, authorize Bracket Planning (operating under Wealth Architects Inc.) and its payment " +
        "processor, Helcim, to debit the bank account you provide for the amounts and on the schedule described below. " +
        "This is a Personal PAD (Payments Canada category) for the financial planning services you have engaged us for.",
    },
    {
      heading: "Amount and frequency",
      body:
        "For the {{tierName}} retainer, you authorize a recurring debit of {{totalAmount}} (including GST/HST) every six " +
        "months, beginning on the date your first payment is processed, until this agreement is cancelled. For a plan-only " +
        "engagement, you authorize a single debit of {{totalAmount}}. If any amount changes, we will notify you at least " +
        "ten (10) days before the affected debit.",
    },
    {
      heading: "Your rights",
      body:
        "You may revoke this authorization at any time, subject to providing notice before the next scheduled debit (for " +
        "retainer engagements, after the first two required semi-annual payments). To revoke, contact us at " +
        "info@bracketplanning.ca. You have certain recourse rights if any debit does not comply with this agreement — " +
        "for example, the right to receive reimbursement for any debit that is not authorized or is not consistent with " +
        "this PAD agreement. For more information on your recourse rights, contact your financial institution or visit " +
        "payments.ca.",
    },
    {
      heading: "Waiver of pre-notification",
      body:
        "Because the amount and schedule are fixed by this agreement, you waive the right to advance notice of each " +
        "individual debit. You will still receive at least ten (10) days’ notice of any change to the amount or schedule.",
    },
    {
      heading: "Authorization",
      body:
        "By typing your name and confirming below, you agree to this PAD agreement and confirm you are an authorized " +
        "signatory on the bank account being used. Your electronic signature is legally binding.",
    },
  ],
};

const DOCS = {
  engagement_letter: ENGAGEMENT_LETTER,
  pad: PAD_AGREEMENT,
};

export function getDoc(type) {
  return DOCS[type] || null;
}

// Fill {{placeholders}} from a values map. Missing keys are left as
// a readable blank rather than the raw placeholder token.
export function renderDoc(doc, values = {}) {
  const fill = (text) =>
    text.replace(/\{\{(\w+)\}\}/g, (_, key) =>
      values[key] != null && values[key] !== "" ? String(values[key]) : "—"
    );
  return {
    version: doc.version,
    title: doc.title,
    blocks: doc.blocks.map((b) => ({ heading: b.heading, body: fill(b.body) })),
  };
}

// Deterministic hash of the *rendered* document, so the stored
// signature pins the exact text the client saw.
export async function hashDoc(rendered) {
  const canonical = JSON.stringify({
    version: rendered.version,
    title: rendered.title,
    blocks: rendered.blocks,
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
