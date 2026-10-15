-- Creates a dedicated SpendWise table without altering or deleting existing tables/data.
do $$
declare
  unexpected_policy text;
begin
  select policyname into unexpected_policy
  from pg_policies
  where schemaname = 'public'
    and tablename = 'spendwise_expenses'
    and policyname not in (
      'Users can read their own SpendWise expenses',
      'Users can create their own SpendWise expenses',
      'Users can update their own SpendWise expenses',
      'Users can delete their own SpendWise expenses'
    )
  limit 1;

  if found then
    raise exception 'Unexpected policy "%" exists on public.spendwise_expenses; inspect and remove it before applying this migration',
      unexpected_policy;
  end if;
end;
$$;

create table if not exists public.spendwise_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  description text not null,
  amount_cents bigint not null check (amount_cents > 0),
  category text not null check (category in (
    'Food & Dining',
    'Transport',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Health & Fitness',
    'Education',
    'Travel',
    'Subscriptions',
    'Personal Care',
    'Other'
  )),
  date date not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists spendwise_expenses_user_date_idx
  on public.spendwise_expenses (user_id, date desc);

alter table public.spendwise_expenses enable row level security;

grant select, insert, update, delete on public.spendwise_expenses to authenticated;

drop policy if exists "Users can read their own SpendWise expenses"
  on public.spendwise_expenses;
drop policy if exists "Users can create their own SpendWise expenses"
  on public.spendwise_expenses;
drop policy if exists "Users can update their own SpendWise expenses"
  on public.spendwise_expenses;
drop policy if exists "Users can delete their own SpendWise expenses"
  on public.spendwise_expenses;

create policy "Users can read their own SpendWise expenses"
  on public.spendwise_expenses for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their own SpendWise expenses"
  on public.spendwise_expenses for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own SpendWise expenses"
  on public.spendwise_expenses for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own SpendWise expenses"
  on public.spendwise_expenses for delete to authenticated
  using ((select auth.uid()) = user_id);
