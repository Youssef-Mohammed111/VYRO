-- VYRO operations upgrade. Idempotent — safe to re-run.
--   * order settings owned by the business (delivery fee, minimum order, pause switch)
--   * staff invitations (replaces "every new sign-up becomes tenant admin")
--   * indexes for the live-orders board and dashboard queries

alter table business_profiles add column if not exists delivery_fee integer not null default 30;
alter table business_profiles add column if not exists min_order integer not null default 0;
alter table business_profiles add column if not exists accepting_orders boolean not null default true;

create table if not exists staff_invites (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  role text not null,
  token text not null unique,
  label text,
  created_by text,
  expires_at timestamptz not null,
  accepted_by text,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists staff_invites_tenant_idx on staff_invites (tenant_id, created_at desc);

create index if not exists orders_tenant_created_idx on orders (tenant_id, created_at desc);
create index if not exists payments_order_idx on payments (order_id);
create index if not exists payment_proofs_payment_idx on payment_proofs (payment_id);
create index if not exists order_items_tenant_idx on order_items (tenant_id);

-- One membership per (user, tenant). Only created when existing data has no
-- duplicates, so this can never fail a deploy on an already-populated database.
do $$
begin
  if not exists (
    select 1 from members where tenant_id is not null
    group by user_id, tenant_id having count(*) > 1
  ) then
    create unique index if not exists members_user_tenant_uidx on members (user_id, tenant_id);
  end if;
end
$$;
