import { getUserFromSession, json, randomId, readJson } from "../../_lib/auth.js";

export const questions = [
  { type: "section", id: "personal_section", label: "Personal Information" },
  { id: "client_details", label: "Client and spouse/partner details", type: "repeater", addLabel: "Add person", fields: [
    { id: "name", label: "Name" },
    { id: "date_of_birth", label: "Date of birth" },
    { id: "address", label: "Address" },
    { id: "employer", label: "Employer" },
    { id: "occupation", label: "Occupation" },
    { id: "phone", label: "Phone number" },
    { id: "email", label: "Email address" },
    { id: "citizenship", label: "Citizenship(s)" }
  ] },
  { id: "children_resp", label: "Children and RESP details", type: "repeater", addLabel: "Add child", fields: [
    { id: "name", label: "Name" },
    { id: "date_of_birth", label: "Date of birth" },
    { id: "resp_balance", label: "RESP balance" },
    { id: "resp_contributions", label: "RESP contributions and CESG received to date" },
    { id: "annual_education_cost", label: "Annual education cost" },
    { id: "education_start_age", label: "Education start age" },
    { id: "education_length", label: "Education length" }
  ] },

  { type: "section", id: "goals_section", label: "Financial Goals" },
  { id: "planning_questions", label: "What questions can we help you answer?", help: "For example: Do I have enough money to retire comfortably? How long will my money last? What is the most I can spend?", type: "textarea", required: true },
  { id: "retirement_lifestyle_expense", label: "Desired annual after-tax lifestyle expense", help: "Your base living expenses: the normal annual spending you want your plan to support after tax. Include regular household spending such as food, utilities, property tax, insurance, transportation, health, subscriptions, gifts, and routine travel. Exclude one-time goals like renovations, vehicle purchases, or large special trips; add those under other financial goals or additional expenses.", type: "text" },
  { id: "retirement_timing", label: "When would you like to retire?", type: "textarea" },
  { id: "legacy_goals", label: "Is it important for you to pass assets to family or charity as a legacy?", type: "textarea" },
  { id: "financial_goals", label: "Other financial goals and timing", help: "For example: home renovation, debt repayment, travel, major purchases, or other goals.", type: "textarea" },

  { type: "section", id: "cashflow_section", label: "Expenses, Income, Pensions, and Government Benefits" },
  { id: "additional_expenses", label: "Additional expenses", help: "Examples: vacations, vehicles, renovations, one-time or recurring expenses.", type: "repeater", addLabel: "Add expense", fields: [
    { id: "client", label: "Client" },
    { id: "description", label: "Expense description" },
    { id: "annual_amount", label: "Annual amount" },
    { id: "from_age", label: "From age" },
    { id: "to_age", label: "To age" },
    { id: "frequency", label: "Frequency" }
  ] },
  { id: "income_sources", label: "Income sources", help: "Employment, self-employment, rental, consulting, or other income before tax. Exclude investment income. Enter CPP and OAS below. You can usually find these amounts on pay stubs, employment contracts, T4s, business records, or rental statements.", type: "repeater", addLabel: "Add income source", fields: [
    { id: "client", label: "Client" },
    { id: "source", label: "Source" },
    { id: "annual_gross_amount", label: "Annual gross amount", help: "Income before tax and deductions. For employment income, use salary plus expected bonus if applicable. Find this on your employment contract, pay stub, T4, or business/rental records." },
    { id: "end_date", label: "End date", help: "When this income is expected to stop. If it is ongoing or unknown, leave blank or write ongoing." }
  ] },
  { id: "defined_benefit_pensions", label: "Defined benefit pensions", type: "repeater", addLabel: "Add DB pension", fields: [
    { id: "client", label: "Client" },
    { id: "source", label: "Source" },
    { id: "start_age", label: "Start age" },
    { id: "pre65_gross", label: "Gross annual before 65", help: "The annual pension amount paid before age 65, before tax. Some pensions reduce at 65 when bridge benefits end. Find this on your pension estimate or annual pension statement." },
    { id: "pre65_survivor", label: "Survivor % before 65", help: "The percentage of your pension that would continue to a spouse/partner if you died. Common examples are 50%, 60%, 66.7%, or 100%. Find this on your pension option statement." },
    { id: "pre65_indexing", label: "Indexing % before 65", help: "The annual inflation increase before age 65, if any. Your pension statement may say indexed to CPI, partial CPI, fixed 2%, or not indexed." },
    { id: "post65_gross", label: "Gross annual at/after 65", help: "The annual pension amount paid from age 65 onward, before tax. Use this if the pension changes at 65. Find this on your pension estimate or annual statement." },
    { id: "post65_survivor", label: "Survivor % at/after 65", help: "The percentage of the age-65-and-after pension that would continue to a spouse/partner if you died." },
    { id: "post65_indexing", label: "Indexing % at/after 65", help: "The annual inflation increase after age 65, if any. Look for CPI/indexing details on your pension statement." }
  ] },
  { id: "defined_contribution_pensions", label: "Defined contribution pensions", type: "repeater", addLabel: "Add DC pension", fields: [
    { id: "client", label: "Client" },
    { id: "balance", label: "Balance", help: "Current account value of the workplace pension. Find this on your pension provider website or most recent statement." },
    { id: "employee_contribution", label: "Employee contribution %", help: "The percentage of pay you contribute to the plan. Find this on your pay stub, HR portal, plan booklet, or pension statement." },
    { id: "employer_contribution", label: "Employer contribution %", help: "The percentage of pay your employer contributes. Find this on your HR portal, plan booklet, or pension statement." }
  ] },
  { id: "cpp_benefits", label: "CPP - Canada Pension Plan", type: "repeater", addLabel: "Add CPP benefit", fields: [
    { id: "client", label: "Client" },
    { id: "start_age", label: "Start age" },
    { id: "gross_annual", label: "Gross annual dollar amount", help: "Estimated annual CPP before tax at the start age you selected. Find this in your My Service Canada Account CPP statement or CPP estimate." },
    { id: "percent_maximum", label: "% of maximum (optional)", help: "If you do not know the dollar amount, enter the percentage of the maximum CPP benefit shown in your CPP estimate." }
  ] },
  { id: "oas_benefits", label: "OAS - Old Age Security", type: "repeater", addLabel: "Add OAS benefit", fields: [
    { id: "client", label: "Client" },
    { id: "start_age", label: "Start age" },
    { id: "gross_annual", label: "Gross annual dollar amount", help: "Estimated annual OAS before tax. Find this on Service Canada OAS information or leave blank if unsure." },
    { id: "eligibility", label: "40 years in Canada? / % of maximum", help: "OAS depends on years of Canadian residency after age 18. If you lived in Canada for 40+ years, note yes. Otherwise enter your estimated percentage or details." }
  ] },

  { type: "section", id: "net_worth_section", label: "Net Worth" },
  { id: "registered_assets", label: "Registered financial assets", help: "Tax-registered accounts such as TFSA, RRSP/RRIF, Spousal RRSP, FHSA, RESP, LIRA/LIF, or RDSP. Find values and contribution details on investment statements, online brokerage accounts, CRA My Account, or your employer plan portal.", type: "repeater", addLabel: "Add registered account", fields: [
    { id: "owners", label: "Owner(s)" },
    { id: "account_type", label: "Account type", help: "Examples: TFSA, RRSP, RRIF, Spousal RRSP, FHSA, RESP, LIRA, LIF, RDSP." },
    { id: "institution", label: "Financial institution", help: "The bank, brokerage, insurer, or workplace plan provider that holds the account." },
    { id: "market_value", label: "Market value", help: "Current account balance or approximate value. Find this on your most recent statement or online account." },
    { id: "contribution_room", label: "Contribution room", help: "How much you can still contribute. TFSA/RRSP/FHSA room can often be found in CRA My Account or on your Notice of Assessment." },
    { id: "annual_contributions", label: "Annual contributions incl. employer", help: "How much is being contributed each year, including payroll deductions and employer matching if applicable." }
  ] },
  { id: "non_registered_assets", label: "Non-registered financial assets", help: "Investment or savings accounts that are not inside registered plans like RRSPs or TFSAs. Examples: taxable brokerage accounts, joint investment accounts, high-interest savings, GICs outside a TFSA/RRSP, private investments, or company shares held personally. Find values and cost base on investment statements, online brokerage records, T3/T5 slips, realized gain/loss reports, or tax packages.", type: "repeater", addLabel: "Add non-registered asset", fields: [
    { id: "owners", label: "Owner(s)" },
    { id: "account_type", label: "Account type", help: "Examples: taxable investment account, joint non-registered account, savings account, GIC, private investment, or shares." },
    { id: "institution", label: "Financial institution", help: "The bank, brokerage, investment firm, or other institution that holds the asset." },
    { id: "market_value", label: "Market value", help: "Current value or account balance. Find this on your latest statement or online account." },
    { id: "annual_contributions", label: "Annual contributions incl. employer", help: "How much you expect to add each year. For non-registered accounts this is usually personal savings, not employer contributions." }
  ] },
  { id: "real_assets", label: "Real assets", help: "Principal residence, vacation property, rental property, or other real assets.", type: "repeater", addLabel: "Add real asset", fields: [
    { id: "owners", label: "Owner(s)" },
    { id: "type", label: "Type" },
    { id: "location", label: "Location" },
    { id: "market_value", label: "Market value", help: "Estimated current property value. Use a recent appraisal, realtor estimate, property assessment, or your best estimate." },
    { id: "adjusted_cost_base", label: "Adjusted cost base", help: "Usually what you paid for the property plus eligible improvements and purchase costs. For tax-sensitive properties, your accountant may have this." },
    { id: "net_rental_income", label: "Net rental income (optional)", help: "Annual rental income after rental expenses but before personal tax, if this is a rental property. Leave blank if not applicable. Find this on rental records or your tax return rental statement." }
  ] },
  { id: "debts", label: "Debts and liabilities", type: "repeater", addLabel: "Add debt", fields: [
    { id: "owners", label: "Owner(s)" },
    { id: "type", label: "Type" },
    { id: "institution", label: "Financial institution" },
    { id: "balance", label: "Balance", help: "Current amount owing. Find this on your mortgage, loan, line of credit, or credit card statement." },
    { id: "interest_rate", label: "Interest rate", help: "The annual interest rate on the debt. Find this on your statement, mortgage renewal, or online banking." },
    { id: "monthly_payment", label: "Monthly payment", help: "The regular required payment. If payments are weekly or biweekly, note that in the field." }
  ] },

  { type: "section", id: "insurance_section", label: "Insurance" },
  { id: "life_insurance", label: "Life insurance", type: "repeater", addLabel: "Add policy", fields: [
    { id: "owners", label: "Owner(s)" },
    { id: "type", label: "Type" },
    { id: "life_insured", label: "Life insured" },
    { id: "beneficiaries", label: "Beneficiaries" },
    { id: "coverage_details", label: "Coverage details: premiums, benefit, end date, provider, etc.", help: "Include insurer/provider, death benefit amount, premium, term length or expiry date, policy owner, and any important riders. Find this on the policy contract, annual statement, or benefits booklet." }
  ] },
  { id: "disability_insurance", label: "Disability insurance", type: "repeater", addLabel: "Add disability coverage", fields: [
    { id: "owner", label: "Owner" },
    { id: "type", label: "Type" },
    { id: "coverage_details", label: "Coverage details: premiums, benefit, end date, provider, riders, etc.", help: "Include monthly benefit, waiting period, benefit period, premium, provider, and whether it is individual or group coverage. Find this on your policy, workplace benefits booklet, or insurer statement." }
  ] },
  { id: "critical_illness_insurance", label: "Critical illness insurance", type: "repeater", addLabel: "Add critical illness coverage", fields: [
    { id: "owner", label: "Owner" },
    { id: "type", label: "Type" },
    { id: "coverage_details", label: "Coverage details: premiums, benefit, end date, provider, riders, etc.", help: "Include lump-sum benefit amount, covered conditions if known, premium, provider, expiry date, and return-of-premium riders. Find this on the policy contract or annual statement." }
  ] },

  { type: "section", id: "corporations_section", label: "Corporations" },
  { id: "corporations", label: "List of corporations", type: "repeater", addLabel: "Add corporation", fields: [
    { id: "name", label: "Name / description" },
    { id: "province", label: "Province of incorporation" },
    { id: "client_ownership", label: "Client ownership %" },
    { id: "spouse_ownership", label: "Spouse ownership %" },
    { id: "other_ownership", label: "Other ownership %" },
    { id: "eligible_rdtoh", label: "Eligible RDTOH", help: "Refundable dividend tax on hand related to eligible dividends. This is a corporate tax balance. Find it on the corporation's T2 return, notice of assessment, or ask your accountant." },
    { id: "non_eligible_rdtoh", label: "Non-eligible RDTOH", help: "Refundable dividend tax on hand related to non-eligible dividends. Find it on the corporation's T2 return, notice of assessment, or ask your accountant." },
    { id: "cda", label: "CDA", help: "Capital Dividend Account balance. This allows certain tax-free capital dividends from a private corporation. Find it in corporate tax records or ask your accountant." }
  ] },
  { id: "corporate_assets", label: "Corporate assets", type: "repeater", addLabel: "Add corporate asset", fields: [
    { id: "corporation", label: "Corporation" },
    { id: "description", label: "Description" },
    { id: "market_value", label: "Market value", help: "Current estimated value of the corporate asset. Use statements, appraisals, accounting records, or your best estimate." },
    { id: "adjusted_cost_base", label: "Adjusted cost base", help: "The corporation's tax cost or book value for the asset. Find this in corporate statements, tax schedules, or ask your accountant." },
    { id: "contributions_or_income", label: "Contributions or net rental income", help: "Annual additions to the asset, or net rental income if the corporate asset is rental property." }
  ] },
  { id: "corporate_income_expenses", label: "Corporate income and expenses", type: "repeater", addLabel: "Add corporate income/expense", fields: [
    { id: "corporation", label: "Corporation" },
    { id: "active_business_income", label: "Active business income", help: "Business income earned from operations before investment income. Find this on financial statements, bookkeeping reports, or the T2 corporate tax return." },
    { id: "tax_deductible_expenses", label: "Tax-deductible expenses", help: "Business expenses that reduce taxable income. Use your income statement, bookkeeping report, or accountant-prepared financial statements." },
    { id: "non_deductible_expenses", label: "Non-deductible expenses", help: "Expenses paid by the corporation that may not be deductible for tax, such as some meals/entertainment portions, penalties, or personal expenses. Ask your accountant if unsure." }
  ] },
  { id: "shareholder_income", label: "Shareholder income", type: "repeater", addLabel: "Add shareholder income", fields: [
    { id: "shareholder", label: "Shareholder" },
    { id: "corporation", label: "Corporation" },
    { id: "salary", label: "Salary" },
    { id: "non_eligible_dividends", label: "Non-eligible dividends", help: "Dividends usually paid from small business income. Find this on T5 slips, corporate records, or accountant summaries." },
    { id: "eligible_dividends", label: "Eligible dividends", help: "Dividends usually paid from income taxed at the general corporate rate. Find this on T5 slips, corporate records, or accountant summaries." }
  ] },
  { id: "corporate_liabilities", label: "Corporate liabilities", type: "repeater", addLabel: "Add corporate liability", fields: [
    { id: "corporation", label: "Corporation" },
    { id: "description", label: "Description" },
    { id: "balance", label: "Balance" },
    { id: "interest_rate", label: "Interest rate", help: "Annual interest rate on the corporate debt. Find it on loan agreements, statements, or online banking." },
    { id: "payments", label: "Payments", help: "Regular payment amount and frequency, such as monthly, quarterly, or annual." }
  ] },
  { id: "corporate_life_insurance", label: "Corporate-owned life insurance", type: "repeater", addLabel: "Add corporate policy", fields: [
    { id: "description", label: "Description" },
    { id: "type", label: "Type" },
    { id: "life_insured", label: "Life insured" },
    { id: "beneficiaries", label: "Beneficiaries" },
    { id: "coverage_details", label: "Coverage details: premiums, benefit, end date, provider, etc.", help: "Include provider, benefit amount, premium, policy owner, insured person, and expiry or renewal details. Find this on the corporate policy contract or annual statement." }
  ] },
  { id: "accountant", label: "Accountant", type: "repeater", addLabel: "Add accountant", fields: [
    { id: "name", label: "Name" },
    { id: "firm", label: "Firm" },
    { id: "phone", label: "Phone number" },
    { id: "email", label: "Email address" },
    { id: "address", label: "Address" }
  ] },

  { type: "section", id: "investment_section", label: "Investment Profile" },
  { id: "asset_allocation", label: "Asset allocation by goal or asset", type: "repeater", addLabel: "Add allocation", fields: [
    { id: "goal_or_asset", label: "Goal or asset" },
    { id: "cash_percent", label: "Cash %", help: "Approximate percentage held in cash, chequing, savings, money market, or short-term deposits. Find this on investment statements or portfolio reports." },
    { id: "cash_return", label: "Cash RoR", help: "Expected annual rate of return for cash holdings. If unsure, leave blank." },
    { id: "fixed_income_percent", label: "Fixed income %", help: "Approximate percentage held in bonds, bond funds, GICs, or similar lower-volatility investments. Find this on portfolio statements." },
    { id: "fixed_income_return", label: "Fixed income RoR", help: "Expected annual rate of return for fixed income. If unsure, leave blank." },
    { id: "equity_percent", label: "Equity %", help: "Approximate percentage held in stocks or equity funds/ETFs. Find this on portfolio statements or asset allocation reports." },
    { id: "equity_return", label: "Equity RoR", help: "Expected annual rate of return for equities. If unsure, leave blank." }
  ] },
  { id: "investment_notes", label: "Investment notes", type: "textarea" },

  { type: "section", id: "estate_section", label: "Estate Planning" },
  { id: "wills", label: "Wills", type: "repeater", addLabel: "Add will", fields: [
    { id: "clients", label: "Client(s)" },
    { id: "type", label: "Type" },
    { id: "last_updated", label: "Date last updated" },
    { id: "details", label: "Details: executor, guardian, location, etc.", help: "Include executor/liquidator, guardian if relevant, where the original will is stored, and any important notes. Find this in your estate documents or ask your lawyer." }
  ] },
  { id: "powers_of_attorney", label: "Powers of attorney", type: "repeater", addLabel: "Add power of attorney", fields: [
    { id: "client", label: "Client" },
    { id: "type", label: "Type" },
    { id: "last_updated", label: "Date last updated" },
    { id: "details", label: "Details: attorney, location, etc.", help: "Include named attorney/decision-maker, where the original document is stored, and any important notes. Find this in your estate documents or ask your lawyer." }
  ] },
  { id: "lawyer", label: "Lawyer", type: "repeater", addLabel: "Add lawyer", fields: [
    { id: "name", label: "Name" },
    { id: "firm", label: "Firm" },
    { id: "phone", label: "Phone number" },
    { id: "email", label: "Email address" },
    { id: "address", label: "Address" }
  ] },

  { type: "section", id: "notes_section", label: "Notes" },
  { id: "notes", label: "Anything else we should know?", type: "textarea" },
];

export async function onRequestGet({ request, env }) {
  const user = await getUserFromSession(request, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  let response = await env.DB.prepare(
    "select id, status, answers_json, submitted_at, updated_at from questionnaire_responses where user_id = ? order by created_at desc limit 1"
  ).bind(user.id).first();

  if (!response) {
    response = { id: null, status: "draft", answers_json: "{}", submitted_at: null, updated_at: null };
  }

  return json({ questions, response: { ...response, answers: JSON.parse(response.answers_json || "{}") } });
}

export async function onRequestPost({ request, env }) {
  const user = await getUserFromSession(request, env);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJson(request);
  const answers = body.answers && typeof body.answers === "object" ? body.answers : {};
  const submit = Boolean(body.submit);

  for (const question of questions) {
    if (question.required && submit && question.type !== "section" && !String(answers[question.id] || "").trim()) {
      return json({ error: `Answer required: ${question.label}` }, { status: 400 });
    }
  }

  const existing = await env.DB.prepare(
    "select id from questionnaire_responses where user_id = ? order by created_at desc limit 1"
  ).bind(user.id).first();
  const now = new Date().toISOString();
  const status = submit ? "submitted" : "draft";
  const submittedAt = submit ? now : null;
  const answersJson = JSON.stringify(answers);

  if (existing) {
    await env.DB.prepare(
      "update questionnaire_responses set answers_json = ?, status = ?, submitted_at = coalesce(?, submitted_at), updated_at = ? where id = ?"
    ).bind(answersJson, status, submittedAt, now, existing.id).run();
  } else {
    await env.DB.prepare(
      "insert into questionnaire_responses (id, user_id, status, answers_json, submitted_at, updated_at) values (?, ?, ?, ?, ?, ?)"
    ).bind(randomId("qr_"), user.id, status, answersJson, submittedAt, now).run();
  }

  return json({ ok: true, status });
}
