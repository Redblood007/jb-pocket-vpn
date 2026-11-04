-- Customer-facing profile data is separated from admin-managed VPN credentials.
-- This prevents customers from reading sensitive fields on public.customers.
create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customer_profiles enable row level security;
grant select, insert, update on public.customer_profiles to authenticated;

create policy "Customers read their own profile"
  on public.customer_profiles for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Customers create their own profile"
  on public.customer_profiles for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Customers update their own profile"
  on public.customer_profiles for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index if not exists customer_profiles_email_idx
  on public.customer_profiles (email);
