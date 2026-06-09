create unique index if not exists deposits_member_month_unique_idx
on public.deposits (member_id, deposit_month);
