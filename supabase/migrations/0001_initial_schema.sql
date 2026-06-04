create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('ADMIN', 'MEMBER')),
  assigned_shares integer not null default 0 check (assigned_shares >= 0),
  is_active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  share_price numeric not null default 5000 check (share_price > 0),
  currency text not null default 'NOK',
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete restrict,
  deposit_month text not null check (deposit_month ~ '^\d{4}-\d{2}$'),
  deposit_date date not null,
  share_count_snapshot integer not null check (share_count_snapshot >= 0),
  share_price_snapshot numeric not null check (share_price_snapshot > 0),
  amount numeric not null check (amount >= 0),
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  note text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  table_name text not null,
  record_id uuid,
  old_value jsonb,
  new_value jsonb,
  performed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists deposits_member_id_idx on public.deposits(member_id);
create index if not exists deposits_deposit_month_idx on public.deposits(deposit_month);
create index if not exists deposits_status_idx on public.deposits(status);
create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists deposits_touch_updated_at on public.deposits;
create trigger deposits_touch_updated_at
before update on public.deposits
for each row execute function public.touch_updated_at();

create or replace function public.get_current_user_profile()
returns public.profiles
language sql
security definer
set search_path = public
stable
as $$
  select *
  from public.profiles
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'ADMIN'
      and is_active = true
  );
$$;

alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.deposits enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_admin_insert" on public.profiles;
create policy "profiles_admin_insert"
on public.profiles
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "settings_select_authenticated" on public.settings;
create policy "settings_select_authenticated"
on public.settings
for select
to authenticated
using (true);

drop policy if exists "settings_admin_insert" on public.settings;
create policy "settings_admin_insert"
on public.settings
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "settings_admin_update" on public.settings;
create policy "settings_admin_update"
on public.settings
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "deposits_select_visible" on public.deposits;
create policy "deposits_select_visible"
on public.deposits
for select
to authenticated
using (
  public.is_admin()
  or member_id = auth.uid()
  or status = 'APPROVED'
);

drop policy if exists "deposits_insert_own_or_admin_pending" on public.deposits;
create policy "deposits_insert_own_or_admin_pending"
on public.deposits
for insert
to authenticated
with check (
  (public.is_admin() or member_id = auth.uid())
  and status = 'PENDING'
  and created_by = auth.uid()
);

drop policy if exists "deposits_admin_update" on public.deposits;
create policy "deposits_admin_update"
on public.deposits
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "deposits_admin_delete" on public.deposits;
create policy "deposits_admin_delete"
on public.deposits
for delete
to authenticated
using (public.is_admin());

drop policy if exists "audit_logs_admin_select" on public.audit_logs;
create policy "audit_logs_admin_select"
on public.audit_logs
for select
to authenticated
using (public.is_admin());

drop policy if exists "audit_logs_admin_insert" on public.audit_logs;
create policy "audit_logs_admin_insert"
on public.audit_logs
for insert
to authenticated
with check (public.is_admin());

insert into public.settings (share_price, currency)
select 5000, 'NOK'
where not exists (select 1 from public.settings);
