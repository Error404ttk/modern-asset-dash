set role to postgres;

-- Helper to ensure a policy exists, using dynamic SQL
create or replace function public.ensure_policy(
  schema_name text,
  table_name text,
  policy_name text,
  policy_sql text
) returns void as $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = schema_name
      and tablename = table_name
      and policyname = policy_name
  ) then
    execute policy_sql;
  end if;
end;
$$ language plpgsql;

select public.ensure_policy(
  'public',
  'ink_brands',
  'Allow authenticated insert ink brands',
  $$create policy "Allow authenticated insert ink brands"
    on public.ink_brands
    for insert
    to authenticated
    with check (true);$$
);

select public.ensure_policy(
  'public',
  'ink_brands',
  'Allow authenticated update ink brands',
  $$create policy "Allow authenticated update ink brands"
    on public.ink_brands
    for update
    to authenticated
    using (true)
    with check (true);$$
);

select public.ensure_policy(
  'public',
  'ink_brands',
  'Allow authenticated delete ink brands',
  $$create policy "Allow authenticated delete ink brands"
    on public.ink_brands
    for delete
    to authenticated
    using (true);$$
);

select public.ensure_policy(
  'public',
  'ink_models',
  'Allow authenticated insert ink models',
  $$create policy "Allow authenticated insert ink models"
    on public.ink_models
    for insert
    to authenticated
    with check (true);$$
);

select public.ensure_policy(
  'public',
  'ink_models',
  'Allow authenticated update ink models',
  $$create policy "Allow authenticated update ink models"
    on public.ink_models
    for update
    to authenticated
    using (true)
    with check (true);$$
);

select public.ensure_policy(
  'public',
  'ink_models',
  'Allow authenticated delete ink models',
  $$create policy "Allow authenticated delete ink models"
    on public.ink_models
    for delete
    to authenticated
    using (true);$$
);

select public.ensure_policy(
  'public',
  'ink_inventory',
  'Allow authenticated insert ink inventory',
  $$create policy "Allow authenticated insert ink inventory"
    on public.ink_inventory
    for insert
    to authenticated
    with check (true);$$
);

select public.ensure_policy(
  'public',
  'ink_inventory',
  'Allow authenticated update ink inventory',
  $$create policy "Allow authenticated update ink inventory"
    on public.ink_inventory
    for update
    to authenticated
    using (true)
    with check (true);$$
);

select public.ensure_policy(
  'public',
  'ink_inventory',
  'Allow authenticated delete ink inventory',
  $$create policy "Allow authenticated delete ink inventory"
    on public.ink_inventory
    for delete
    to authenticated
    using (true);$$
);

select public.ensure_policy(
  'public',
  'ink_suppliers',
  'Allow authenticated insert ink suppliers',
  $$create policy "Allow authenticated insert ink suppliers"
    on public.ink_suppliers
    for insert
    to authenticated
    with check (true);$$
);

select public.ensure_policy(
  'public',
  'ink_suppliers',
  'Allow authenticated update ink suppliers',
  $$create policy "Allow authenticated update ink suppliers"
    on public.ink_suppliers
    for update
    to authenticated
    using (true)
    with check (true);$$
);

select public.ensure_policy(
  'public',
  'ink_suppliers',
  'Allow authenticated delete ink suppliers',
  $$create policy "Allow authenticated delete ink suppliers"
    on public.ink_suppliers
    for delete
    to authenticated
    using (true);$$
);

select public.ensure_policy(
  'public',
  'ink_receipts',
  'Allow authenticated insert ink receipts',
  $$create policy "Allow authenticated insert ink receipts"
    on public.ink_receipts
    for insert
    to authenticated
    with check (true);$$
);

select public.ensure_policy(
  'public',
  'ink_receipts',
  'Allow authenticated update ink receipts',
  $$create policy "Allow authenticated update ink receipts"
    on public.ink_receipts
    for update
    to authenticated
    using (true)
    with check (true);$$
);

select public.ensure_policy(
  'public',
  'ink_receipts',
  'Allow authenticated delete ink receipts',
  $$create policy "Allow authenticated delete ink receipts"
    on public.ink_receipts
    for delete
    to authenticated
    using (true);$$
);

select public.ensure_policy(
  'public',
  'ink_receipt_items',
  'Allow authenticated insert ink receipt items',
  $$create policy "Allow authenticated insert ink receipt items"
    on public.ink_receipt_items
    for insert
    to authenticated
    with check (true);$$
);

select public.ensure_policy(
  'public',
  'ink_receipt_items',
  'Allow authenticated update ink receipt items',
  $$create policy "Allow authenticated update ink receipt items"
    on public.ink_receipt_items
    for update
    to authenticated
    using (true)
    with check (true);$$
);

select public.ensure_policy(
  'public',
  'ink_receipt_items',
  'Allow authenticated delete ink receipt items',
  $$create policy "Allow authenticated delete ink receipt items"
    on public.ink_receipt_items
    for delete
    to authenticated
    using (true);$$
);

select public.ensure_policy(
  'public',
  'ink_attachments',
  'Allow authenticated insert ink attachments',
  $$create policy "Allow authenticated insert ink attachments"
    on public.ink_attachments
    for insert
    to authenticated
    with check (true);$$
);

select public.ensure_policy(
  'public',
  'ink_attachments',
  'Allow authenticated update ink attachments',
  $$create policy "Allow authenticated update ink attachments"
    on public.ink_attachments
    for update
    to authenticated
    using (true)
    with check (true);$$
);

select public.ensure_policy(
  'public',
  'ink_attachments',
  'Allow authenticated delete ink attachments',
  $$create policy "Allow authenticated delete ink attachments"
    on public.ink_attachments
    for delete
    to authenticated
    using (true);$$
);

drop function if exists public.ensure_policy(schema_name text, table_name text, policy_name text, policy_sql text);

reset role;
