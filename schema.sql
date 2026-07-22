create table if not exists users (
  id text primary key,
  email text not null unique,
  name text,
  role text not null default 'client' check (role in ('client', 'admin')),
  status text not null default 'invited' check (status in ('invited', 'active', 'disabled')),
  password_hash text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists invites (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  expires_at text not null,
  used_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  token_hash text not null unique,
  expires_at text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists client_records (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  title text not null,
  body text not null,
  record_type text not null default 'note',
  visible_to_client integer not null default 0,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists client_documents (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  title text not null,
  document_type text not null check (document_type in ('plan_pdf', 'spreadsheet', 'docx')),
  file_name text not null,
  content_type text not null,
  r2_key text not null unique,
  size_bytes integer,
  uploaded_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists client_dashboard_data (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  source_document_id text references client_documents(id) on delete set null,
  plan_data_json text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists questionnaire_responses (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  answers_json text not null default '{}',
  submitted_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create table if not exists questionnaire_attachments (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  file_name text not null,
  content_type text not null,
  r2_key text not null unique,
  size_bytes integer,
  uploaded_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists idx_invites_token_hash on invites(token_hash);
create index if not exists idx_sessions_token_hash on sessions(token_hash);
create index if not exists idx_users_email on users(email);
-- ============================================================
--  Payments / checkout (Helcim integration)
-- ============================================================

-- One row per checkout attempt. Holds the selected product, the
-- computed price/tax snapshot, the signed engagement + PAD records,
-- and the Helcim tokens. secret_token is never sent to the browser.
create table if not exists checkout_intents (
  id text primary key,
  user_id text references users(id) on delete set null,
  email text not null,
  name text,
  province text not null,
  tier text not null check (tier in ('foundation', 'integrated', 'private')),
  plan_type text not null check (plan_type in ('retainer', 'plan_only')),
  -- unguessable token (stored hashed) that authorizes the remaining
  -- checkout steps for this intent without a logged-in session
  access_token_hash text not null,
  payment_method text check (payment_method in ('cc', 'ach')),
  -- money is stored in cents to avoid float drift
  base_amount_cents integer not null,
  tax_rate_bps integer not null,            -- e.g. 5% GST -> 500
  tax_amount_cents integer not null,
  total_amount_cents integer not null,
  currency text not null default 'CAD',
  status text not null default 'started'
    check (status in ('started', 'agreement_signed', 'payment_initialized', 'paid', 'failed', 'abandoned')),
  engagement_doc_version text,
  helcim_checkout_token text,
  helcim_secret_token text,
  helcim_customer_code text,
  helcim_card_token text,
  helcim_transaction_id text,
  helcim_subscription_id text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Immutable audit record: exactly what the client agreed to and when.
-- doc_hash pins the wording so we can prove which version was signed.
create table if not exists engagement_agreements (
  id text primary key,
  intent_id text not null references checkout_intents(id) on delete cascade,
  user_id text references users(id) on delete set null,
  agreement_type text not null check (agreement_type in ('engagement_letter', 'pad')),
  doc_version text not null,
  doc_hash text not null,
  signer_name text not null,
  signer_email text not null,
  -- PAD-specific, null for the engagement letter
  bank_last4 text,
  signed_ip text,
  signed_user_agent text,
  signed_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- The live retainer subscription (plan_only purchases don't create one).
create table if not exists subscriptions (
  id text primary key,
  user_id text references users(id) on delete set null,
  intent_id text references checkout_intents(id) on delete set null,
  tier text not null,
  payment_method text not null,
  recurring_amount_cents integer not null,
  currency text not null default 'CAD',
  billing_period text not null default 'monthly',
  billing_period_increments integer not null default 6,
  helcim_customer_code text,
  helcim_subscription_id text,
  helcim_payment_plan_id text,
  status text not null default 'active'
    check (status in ('active', 'past_due', 'cancelled')),
  activated_at text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Append-only log of everything Helcim tells us (payments, webhooks).
create table if not exists payment_events (
  id text primary key,
  intent_id text references checkout_intents(id) on delete set null,
  subscription_id text references subscriptions(id) on delete set null,
  event_type text not null,
  amount_cents integer,
  currency text,
  helcim_transaction_id text,
  raw_json text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create index if not exists idx_client_records_user_id on client_records(user_id);
create index if not exists idx_client_documents_user_id on client_documents(user_id);
create index if not exists idx_client_dashboard_data_user_id on client_dashboard_data(user_id);
create index if not exists idx_questionnaire_responses_user_id on questionnaire_responses(user_id);
create index if not exists idx_questionnaire_attachments_user_id on questionnaire_attachments(user_id);
create index if not exists idx_checkout_intents_user_id on checkout_intents(user_id);
create index if not exists idx_checkout_intents_email on checkout_intents(email);
create index if not exists idx_engagement_agreements_intent_id on engagement_agreements(intent_id);
create index if not exists idx_subscriptions_user_id on subscriptions(user_id);
create index if not exists idx_payment_events_intent_id on payment_events(intent_id);
