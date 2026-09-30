-- VYRO platform schema. Idempotent. No extensions.

create table if not exists platform_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists templates (
  id text primary key,
  slug text not null unique,
  name_en text not null,
  name_ar text not null,
  industry text not null,
  family text not null,
  status text not null default 'active',
  version integer not null default 1,
  layout_json text not null default '{}',
  theme_json text not null default '{}',
  allowed_modules text not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists plans (
  id text primary key,
  slug text not null unique,
  name_en text not null,
  name_ar text not null,
  status text not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists plan_features (
  plan_id text not null references plans(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  limit_value integer,
  primary key (plan_id, feature_key)
);

create table if not exists tenants (
  id text primary key,
  slug text not null unique,
  name text not null,
  status text not null default 'active',
  template_id text not null references templates(id),
  plan_id text not null references plans(id),
  industry text not null default 'restaurant',
  created_at timestamptz not null default now()
);
create index if not exists tenants_status_idx on tenants (status);

create table if not exists tenant_domains (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  domain text not null unique,
  status text not null default 'pending',
  verified_at timestamptz
);

create table if not exists tenant_features (
  tenant_id text not null references tenants(id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  limit_value integer,
  primary key (tenant_id, feature_key)
);

create table if not exists subscriptions (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  plan_id text not null references plans(id),
  status text not null default 'trial',
  start_at timestamptz not null default now(),
  end_at timestamptz,
  renewal_at timestamptz
);
create index if not exists subscriptions_tenant_idx on subscriptions (tenant_id, status);

create table if not exists members (
  id text primary key,
  user_id text not null,
  tenant_id text references tenants(id) on delete cascade,
  role text not null,
  branch_id text,
  created_at timestamptz not null default now()
);
create index if not exists members_user_idx on members (user_id);
create index if not exists members_tenant_idx on members (tenant_id);

create table if not exists branches (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  address_en text,
  address_ar text,
  phone text,
  whatsapp text,
  maps_url text,
  hours_json text not null default '{}',
  status text not null default 'active',
  sort_order integer not null default 0
);
create index if not exists branches_tenant_idx on branches (tenant_id);

create table if not exists business_profiles (
  tenant_id text primary key references tenants(id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  short_en text,
  short_ar text,
  desc_en text,
  desc_ar text,
  phone text,
  whatsapp text,
  email text,
  address_en text,
  address_ar text,
  maps_url text,
  review_url text,
  facebook_url text,
  instagram_url text,
  tiktok_url text,
  website_url text,
  currency text not null default 'EGP',
  country text not null default 'EG',
  timezone text not null default 'Africa/Cairo',
  logo_url text,
  cover_url text,
  favicon_url text,
  hours_json text not null default '{}',
  branding_json text not null default '{}',
  order_prefix text not null default 'ORD'
);

create table if not exists categories (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  slug text not null,
  name_en text not null,
  name_ar text not null,
  image_url text,
  icon text,
  sort_order integer not null default 0,
  active boolean not null default true,
  unique (tenant_id, slug)
);
create index if not exists categories_tenant_idx on categories (tenant_id, sort_order);

create table if not exists catalog_items (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  category_id text references categories(id) on delete set null,
  slug text not null,
  kind text not null default 'product',
  name_en text not null,
  name_ar text not null,
  desc_en text,
  desc_ar text,
  image_url text,
  price integer not null default 0,
  compare_at integer,
  sku text,
  sort_order integer not null default 0,
  featured boolean not null default false,
  available boolean not null default true,
  visible boolean not null default true,
  tags text not null default '',
  meta_json text not null default '{}',
  unique (tenant_id, slug)
);
create index if not exists catalog_items_tenant_idx on catalog_items (tenant_id, category_id, sort_order);

create table if not exists catalog_variants (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  item_id text not null references catalog_items(id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  price integer not null,
  sku text,
  sort_order integer not null default 0,
  available boolean not null default true
);
create index if not exists catalog_variants_item_idx on catalog_variants (item_id, sort_order);

create table if not exists modifier_groups (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  item_id text references catalog_items(id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  required boolean not null default false,
  min_select integer not null default 0,
  max_select integer not null default 3,
  sort_order integer not null default 0
);

create table if not exists modifiers (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  group_id text not null references modifier_groups(id) on delete cascade,
  name_en text not null,
  name_ar text not null,
  price_delta integer not null default 0,
  sort_order integer not null default 0,
  available boolean not null default true
);

create table if not exists offers (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  slug text not null,
  name_en text not null,
  name_ar text not null,
  desc_en text,
  desc_ar text,
  image_url text,
  kind text not null default 'offer_price',
  value integer not null default 0,
  price integer,
  compare_at integer,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  promo_code text,
  usage_limit integer,
  usage_count integer not null default 0,
  sort_order integer not null default 0,
  contents_json text not null default '[]',
  unique (tenant_id, slug)
);
create index if not exists offers_tenant_idx on offers (tenant_id, active);

create table if not exists payment_methods (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  branch_id text references branches(id) on delete cascade,
  type text not null default 'MANUAL',
  name_en text not null,
  name_ar text not null,
  desc_en text,
  desc_ar text,
  payment_url text,
  deep_link_url text,
  account_identifier text,
  account_name text,
  logo_url text,
  instructions_en text,
  instructions_ar text,
  requires_proof boolean not null default false,
  requires_manual_verification boolean not null default true,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  min_amount integer,
  max_amount integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payment_methods_tenant_idx on payment_methods (tenant_id, enabled, sort_order);

create table if not exists orders (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  branch_id text references branches(id) on delete set null,
  public_token text not null unique,
  order_number text not null,
  status text not null default 'PENDING',
  payment_status text not null default 'UNPAID',
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  table_number text,
  fulfillment text not null default 'dine_in',
  address text,
  notes text,
  payment_method_id text,
  payment_snapshot_json text not null default '{}',
  subtotal integer not null,
  discount integer not null default 0,
  fees integer not null default 0,
  total integer not null,
  currency text not null default 'EGP',
  idempotency_key text,
  locale text not null default 'ar',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, order_number),
  unique (tenant_id, idempotency_key)
);
create index if not exists orders_tenant_status_idx on orders (tenant_id, status, created_at desc);
create index if not exists orders_token_idx on orders (public_token);

create table if not exists order_items (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  tenant_id text not null references tenants(id) on delete cascade,
  item_id text,
  name_en text not null,
  name_ar text not null,
  variant_en text,
  variant_ar text,
  unit_price integer not null,
  quantity integer not null,
  modifiers_json text not null default '[]',
  line_total integer not null
);
create index if not exists order_items_order_idx on order_items (order_id);

create table if not exists payments (
  id text primary key,
  order_id text not null references orders(id) on delete cascade,
  tenant_id text not null references tenants(id) on delete cascade,
  method_id text,
  status text not null default 'UNPAID',
  amount integer not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists payment_proofs (
  id text primary key,
  payment_id text not null references payments(id) on delete cascade,
  tenant_id text not null references tenants(id) on delete cascade,
  mime text not null,
  size_bytes integer not null,
  data_base64 text not null,
  created_at timestamptz not null default now()
);

create table if not exists qr_codes (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  branch_id text references branches(id) on delete set null,
  token text not null unique,
  label text not null,
  type text not null,
  destination text not null default 'menu',
  table_number text,
  active boolean not null default true,
  scan_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists qr_codes_tenant_idx on qr_codes (tenant_id);
create index if not exists qr_codes_token_idx on qr_codes (token);

create table if not exists qr_scans (
  id text primary key,
  qr_id text not null references qr_codes(id) on delete cascade,
  tenant_id text not null references tenants(id) on delete cascade,
  created_at timestamptz not null default now(),
  source text,
  meta_json text not null default '{}'
);

create table if not exists nfc_destinations (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  label text not null,
  token text not null unique,
  destination text not null default 'menu',
  created_at timestamptz not null default now()
);

create table if not exists analytics_events (
  id text primary key,
  tenant_id text not null references tenants(id) on delete cascade,
  event text not null,
  path text,
  item_id text,
  qr_token text,
  branch_id text,
  table_number text,
  meta_json text not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists analytics_tenant_idx on analytics_events (tenant_id, event, created_at);

create table if not exists support_tickets (
  id text primary key,
  tenant_id text references tenants(id) on delete set null,
  user_id text,
  subject text not null,
  description text not null,
  priority text not null default 'normal',
  status text not null default 'OPEN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_status_idx on support_tickets (status, created_at desc);

create table if not exists audit_logs (
  id text primary key,
  actor_user_id text,
  tenant_id text,
  action text not null,
  resource text not null,
  resource_id text,
  metadata_json text not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_idx on audit_logs (tenant_id, created_at desc);

create table if not exists notifications (
  id text primary key,
  tenant_id text,
  user_id text,
  type text not null,
  title text not null,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists demo_requests (
  id text primary key,
  name text not null,
  email text not null,
  phone text,
  business text,
  message text,
  status text not null default 'OPEN',
  created_at timestamptz not null default now()
);

create table if not exists system_logs (
  id text primary key,
  severity text not null,
  request_id text,
  tenant_id text,
  user_id text,
  route text,
  event text not null,
  error_code text,
  created_at timestamptz not null default now()
);

create table if not exists media_assets (
  id text primary key,
  tenant_id text references tenants(id) on delete cascade,
  url text not null,
  mime text,
  size_bytes integer,
  created_at timestamptz not null default now()
);

create table if not exists order_counters (
  tenant_id text primary key references tenants(id) on delete cascade,
  last_seq integer not null default 0
);

create table if not exists seed_meta (
  id integer primary key,
  version integer not null,
  applied_at timestamptz not null default now()
);
