-- Subscription billing: plan prices, billing cycle, payments ledger.
alter table plans add column if not exists price_monthly integer not null default 0;
alter table plans add column if not exists price_yearly integer not null default 0;
alter table subscriptions add column if not exists billing_cycle text not null default 'monthly';
alter table subscriptions add column if not exists note text;
alter table subscriptions add column if not exists updated_at timestamptz not null default now();

create table if not exists subscription_payments (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  subscription_id text references subscriptions(id) on delete set null,
  amount integer not null,
  method text not null default 'cash',
  reference text,
  months integer,
  note text,
  recorded_by text,
  created_at timestamptz not null default now()
);
create index if not exists subscription_payments_tenant_idx on subscription_payments (tenant_id, created_at desc);
