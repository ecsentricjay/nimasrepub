-- 0006_payments.sql
-- APC pricing is admin-configurable, not hardcoded (Phase 0 decision).
-- Each payment snapshots the amount actually charged so historical
-- records stay accurate even after the rate changes later.

create table apc_rates (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12, 2) not null,
  currency text not null default 'NGN',
  section_id uuid references sections(id), -- null = applies to all sections
  is_active boolean not null default true,
  effective_from timestamptz not null default now(),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index apc_rates_active_idx on apc_rates (is_active, section_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references articles(id) on delete cascade,

  amount_charged numeric(12, 2) not null,
  currency text not null default 'NGN',
  status payment_status not null default 'pending',
  payment_method payment_method not null default 'paystack',

  paystack_reference text,

  waived_by uuid references profiles(id),
  waived_reason text,

  recorded_by uuid references profiles(id), -- set for manual_offline entries
  paid_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger payments_set_updated_at
  before update on payments
  for each row execute function set_updated_at();

create index payments_article_idx on payments (article_id);
create index payments_status_idx on payments (status);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------

alter table apc_rates enable row level security;
alter table payments enable row level security;

-- apc_rates: public read for pricing transparency on an "APC" info
-- page; only admins manage rates (Phase 0: admin sets/updates pricing).
create policy "apc rates are publicly readable"
  on apc_rates for select
  using (true);

create policy "only admins manage apc rates"
  on apc_rates for insert
  with check (is_admin(auth.uid()));

create policy "only admins update apc rates"
  on apc_rates for update
  using (is_admin(auth.uid()));

create policy "only admins delete apc rates"
  on apc_rates for delete
  using (is_admin(auth.uid()));

-- payments: financial data — visible to the article's author(s) and
-- to admin/editor-in-chief, never to reviewers, section editors, or
-- the public.
create policy "article authors view their own payments"
  on payments for select
  using (is_article_author(article_id, auth.uid()));

create policy "admins and eic view all payments"
  on payments for select
  using (is_admin_or_eic(auth.uid()));

-- Direct client-side inserts are intentionally NOT allowed here.
-- Paystack-confirmed payments are written by the webhook handler using
-- the service-role client (bypasses RLS) after verifying the webhook
-- signature server-side. Manual/waived entries are written by an
-- admin/EIC-only Server Action, which can also use service-role — but
-- the policy below exists as defense-in-depth in case a write is ever
-- attempted through a normal authenticated client.
create policy "admins and eic record manual or waived payments"
  on payments for insert
  with check (
    is_admin_or_eic(auth.uid())
    and payment_method in ('manual_offline', 'waived')
  );

create policy "admins and eic update payments"
  on payments for update
  using (is_admin_or_eic(auth.uid()));

create policy "admins delete payments"
  on payments for delete
  using (is_admin(auth.uid()));
