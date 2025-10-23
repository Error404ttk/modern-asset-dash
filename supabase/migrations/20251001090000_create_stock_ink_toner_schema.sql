-- Stock Ink & Toner core schema
-- Creates dedicated tables for brands, models, inventory, suppliers, receipts, items, and attachments

set role to postgres;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'ink_material_type'
      and n.nspname = 'public'
  ) then
    create type public.ink_material_type as enum ('ink', 'toner', 'drum', 'ribbon');
  end if;
end
$$;
alter type public.ink_material_type owner to postgres;

create table if not exists public.ink_brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
alter table public.ink_brands owner to postgres;

create table if not exists public.ink_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.ink_brands(id) on delete cascade,
  code text not null,
  material_type public.ink_material_type not null default 'ink',
  description text,
  compatible_printers jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (brand_id, code)
);
alter table public.ink_models owner to postgres;

create table if not exists public.ink_inventory (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.ink_models(id) on delete cascade,
  sku text not null unique,
  unit text not null default 'ชิ้น',
  stock_quantity numeric(12,2) not null default 0,
  reorder_point numeric(12,2) not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
alter table public.ink_inventory owner to postgres;

create table if not exists public.ink_suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  tax_id text,
  address text,
  phone text,
  email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
alter table public.ink_suppliers owner to postgres;

create table if not exists public.ink_receipts (
  id uuid primary key default gen_random_uuid(),
  document_no text not null unique,
  supplier_id uuid not null references public.ink_suppliers(id) on delete restrict,
  received_at date not null default timezone('utc', now())::date,
  total_amount numeric(14,2) not null default 0,
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
alter table public.ink_receipts owner to postgres;

create table if not exists public.ink_receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.ink_receipts(id) on delete cascade,
  inventory_id uuid not null references public.ink_inventory(id) on delete restrict,
  quantity numeric(12,2) not null check (quantity > 0),
  unit text not null default 'ชิ้น',
  unit_price numeric(14,2) not null check (unit_price >= 0),
  line_total numeric(14,2) not null check (line_total >= 0),
  remark text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
alter table public.ink_receipt_items owner to postgres;

create table if not exists public.ink_attachments (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.ink_receipts(id) on delete cascade,
  file_name text not null,
  file_type text,
  file_size bigint not null default 0,
  storage_path text not null,
  uploaded_by uuid references auth.users(id),
  metadata jsonb,
  uploaded_at timestamptz not null default timezone('utc', now())
);
alter table public.ink_attachments owner to postgres;

create index if not exists ink_models_brand_idx on public.ink_models (brand_id);
create index if not exists ink_inventory_model_idx on public.ink_inventory (model_id);
create index if not exists ink_receipts_supplier_idx on public.ink_receipts (supplier_id);
create index if not exists ink_receipt_items_receipt_idx on public.ink_receipt_items (receipt_id);
create index if not exists ink_receipt_items_inventory_idx on public.ink_receipt_items (inventory_id);
create index if not exists ink_attachments_receipt_idx on public.ink_attachments (receipt_id);

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;
alter function public.touch_updated_at() owner to postgres;

create or replace function public.ensure_touch_trigger(
  tbl regclass,
  trigger_name text
) returns void as $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = trigger_name
      and tgrelid = tbl
  ) then
    execute format(
      'create trigger %I before update on %s for each row execute function public.touch_updated_at()'
      , trigger_name
      , tbl
    );
  end if;
end;
$$ language plpgsql;

select public.ensure_touch_trigger('public.ink_brands'::regclass, 'trg_touch_ink_brands');
select public.ensure_touch_trigger('public.ink_models'::regclass, 'trg_touch_ink_models');
select public.ensure_touch_trigger('public.ink_inventory'::regclass, 'trg_touch_ink_inventory');
select public.ensure_touch_trigger('public.ink_suppliers'::regclass, 'trg_touch_ink_suppliers');
select public.ensure_touch_trigger('public.ink_receipts'::regclass, 'trg_touch_ink_receipts');
select public.ensure_touch_trigger('public.ink_receipt_items'::regclass, 'trg_touch_ink_receipt_items');

-- optional helper view for dashboard summaries
create or replace view public.vw_ink_receipt_summaries as
  select
    r.id as receipt_id,
    r.document_no,
    r.received_at,
    r.total_amount,
    s.name as supplier_name,
    array_agg(jsonb_build_object(
      'inventory_id', iri.inventory_id,
      'quantity', iri.quantity,
      'unit_price', iri.unit_price,
      'line_total', iri.line_total
    ) order by iri.created_at) as items
  from public.ink_receipts r
  join public.ink_suppliers s on s.id = r.supplier_id
  join public.ink_receipt_items iri on iri.receipt_id = r.id
  group by r.id, s.name;
alter view public.vw_ink_receipt_summaries owner to postgres;

alter table public.ink_brands enable row level security;
alter table public.ink_models enable row level security;
alter table public.ink_inventory enable row level security;
alter table public.ink_suppliers enable row level security;
alter table public.ink_receipts enable row level security;
alter table public.ink_receipt_items enable row level security;
alter table public.ink_attachments enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ink_brands'
      and policyname = 'Allow authenticated read stock ink data'
  ) then
    execute $stmt$
      create policy "Allow authenticated read stock ink data"
      on public.ink_brands for select using (auth.role() = 'authenticated');
    $stmt$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ink_models'
      and policyname = 'Allow authenticated read ink models'
  ) then
    execute $stmt$
      create policy "Allow authenticated read ink models"
      on public.ink_models for select using (auth.role() = 'authenticated');
    $stmt$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ink_inventory'
      and policyname = 'Allow authenticated read ink inventory'
  ) then
    execute $stmt$
      create policy "Allow authenticated read ink inventory"
      on public.ink_inventory for select using (auth.role() = 'authenticated');
    $stmt$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ink_suppliers'
      and policyname = 'Allow authenticated read ink suppliers'
  ) then
    execute $stmt$
      create policy "Allow authenticated read ink suppliers"
      on public.ink_suppliers for select using (auth.role() = 'authenticated');
    $stmt$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ink_receipts'
      and policyname = 'Allow authenticated read ink receipts'
  ) then
    execute $stmt$
      create policy "Allow authenticated read ink receipts"
      on public.ink_receipts for select using (auth.role() = 'authenticated');
    $stmt$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ink_receipt_items'
      and policyname = 'Allow authenticated read ink receipt items'
  ) then
    execute $stmt$
      create policy "Allow authenticated read ink receipt items"
      on public.ink_receipt_items for select using (auth.role() = 'authenticated');
    $stmt$;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ink_attachments'
      and policyname = 'Allow authenticated read ink attachments'
  ) then
    execute $stmt$
      create policy "Allow authenticated read ink attachments"
      on public.ink_attachments for select using (auth.role() = 'authenticated');
    $stmt$;
  end if;
end
$$;

reset role;
