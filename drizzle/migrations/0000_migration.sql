-- Plans shown on the public site, editable from the admin panel
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  price_inr integer not null,
  devices integer not null default 1,
  popular boolean not null default false,
  features jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Customer records managed by the admin (no customer self-login yet)
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  plan_id uuid references public.plans(id) on delete set null,
  vpn_username text,
  vpn_password text,
  started_on date not null default current_date,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Roles live in their own table (never on profiles/users)
create type public.app_role as enum ('admin');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- GRANTS -------------------------------------------------------------
grant select on public.plans to anon;
grant select, insert, update, delete on public.plans to authenticated;
grant all on public.plans to service_role;

grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

-- RLS ----------------------------------------------------------------
alter table public.plans enable row level security;
alter table public.customers enable row level security;
alter table public.user_roles enable row level security;

create policy "Public can read plans"
  on public.plans for select
  to anon, authenticated
  using (true);

create policy "Admins manage customers"
  on public.customers for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Users can read own role"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid());

-- Seed the three plans (placeholder prices — owner will confirm real ones)
insert into public.plans (slug, name, price_inr, devices, popular, features, sort_order) values
  ('basic', 'Basic', 99, 1, false,
   '["1 device","20+ countries","Unlimited data","No-logs policy"]'::jsonb, 1),
  ('pro', 'Pro', 199, 5, true,
   '["5 devices","60+ countries","Unlimited data & speed","Ad & malware blocker","Streaming servers"]'::jsonb, 2),
  ('family', 'Family', 349, 10, false,
   '["10 devices","60+ countries","Everything in Pro","Dedicated IP","24/7 priority support"]'::jsonb, 3);

-- Seed the single admin account (email/password, already confirmed) + admin role
with admin_user as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'admin@shieldxvpn.in', crypt('ShieldX@2026', gen_salt('bf')),
    now(), '{"provider":"email","providers":["email"]}', '{}',
    now(), now(), '', '', '', ''
  )
  returning id
), admin_identity as (
  insert into auth.identities (
    user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  )
  select id, 'email', 'email',
    jsonb_build_object('sub', id::text, 'email', 'admin@shieldxvpn.in'),
    now(), now(), now()
  from admin_user
  returning user_id
)
insert into public.user_roles (user_id, role)
select user_id, 'admin' from admin_identity;