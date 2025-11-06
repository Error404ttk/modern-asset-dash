-- Ensure authenticated users can manage maintenance-docs uploads
create policy "Allow authenticated read maintenance docs"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'maintenance-docs');

create policy "Allow authenticated insert maintenance docs"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'maintenance-docs');

create policy "Allow authenticated update maintenance docs"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'maintenance-docs')
  with check (bucket_id = 'maintenance-docs');

create policy "Allow authenticated delete maintenance docs"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'maintenance-docs');
