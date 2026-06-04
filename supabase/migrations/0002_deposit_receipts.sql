alter table public.deposits
add column if not exists receipt_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'deposit-receipts',
  'deposit-receipts',
  false,
  6291456,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "deposit_receipts_select_owner_or_admin" on storage.objects;
create policy "deposit_receipts_select_owner_or_admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'deposit-receipts'
  and (
    public.is_admin()
    or exists (
      select 1
      from public.deposits
      where receipt_path = storage.objects.name
        and member_id = auth.uid()
    )
  )
);

drop policy if exists "deposit_receipts_insert_owner_or_admin" on storage.objects;
create policy "deposit_receipts_insert_owner_or_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'deposit-receipts'
  and (
    public.is_admin()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);

drop policy if exists "deposit_receipts_update_admin" on storage.objects;
create policy "deposit_receipts_update_admin"
on storage.objects
for update
to authenticated
using (bucket_id = 'deposit-receipts' and public.is_admin())
with check (bucket_id = 'deposit-receipts' and public.is_admin());

drop policy if exists "deposit_receipts_delete_admin" on storage.objects;
create policy "deposit_receipts_delete_admin"
on storage.objects
for delete
to authenticated
using (bucket_id = 'deposit-receipts' and public.is_admin());
