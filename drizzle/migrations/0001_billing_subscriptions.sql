-- JB Pocket VPN PRO billing foundation.
-- Live provider callbacks must verify their signature before invoking the service-role RPC.

alter table public.plans
  add column if not exists billing_period text not null default 'monthly'
    check (billing_period in ('monthly', 'yearly')),
  add column if not exists duration_days integer not null default 30
    check (duration_days between 1 and 730);

alter table public.customers
  add column if not exists expires_at timestamptz;

insert into public.plans (slug, name, price_inr, devices, popular, features, sort_order, billing_period, duration_days)
values
  ('basic-yearly', 'Basic Yearly', 999, 1, false, '["1 device","20+ countries","Unlimited data","No-logs policy"]'::jsonb, 4, 'yearly', 365),
  ('pro-yearly', 'Pro Yearly', 1999, 5, true, '["5 devices","60+ countries","Unlimited data & speed","Ad & malware blocker","Streaming servers"]'::jsonb, 5, 'yearly', 365),
  ('family-yearly', 'Family Yearly', 3499, 10, false, '["10 devices","60+ countries","Unlimited data & speed","Dedicated IP","24/7 priority support"]'::jsonb, 6, 'yearly', 365)
on conflict (slug) do nothing;

create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  order_reference text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  plan_id uuid not null references public.plans(id) on delete restrict,
  amount_inr integer not null check (amount_inr > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  status text not null default 'pending'
    check (status in ('pending','paid','failed','expired','refunded')),
  provider text not null default 'manual'
    check (provider in ('manual','razorpay','phonepe')),
  provider_payment_id text unique,
  paid_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.payment_orders(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  plan_id uuid not null references public.plans(id) on delete restrict,
  status text not null default 'active' check (status in ('active','expired','cancelled')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)
);

create table if not exists public.wireguard_peers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  public_key text not null unique,
  assigned_ip inet unique,
  status text not null default 'provisioning'
    check (status in ('provisioning','active','revoked','error')),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table public.payment_orders enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.wireguard_peers enable row level security;

create policy "Admins manage payment orders"
  on public.payment_orders for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins read subscriptions"
  on public.subscriptions for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins read webhook events"
  on public.payment_webhook_events for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins manage WireGuard peers"
  on public.wireguard_peers for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

grant select, insert, update, delete on public.payment_orders to authenticated;
grant select on public.subscriptions, public.payment_webhook_events to authenticated;
grant select, insert, update, delete on public.wireguard_peers to authenticated;
grant all on public.payment_orders, public.subscriptions, public.payment_webhook_events, public.wireguard_peers to service_role;

-- Called only by a trusted server after gateway signature + amount/order verification.
-- Unique order_id makes retries safe; a repeated callback cannot create duplicate access.
create or replace function public.confirm_paid_order(
  p_order_id uuid,
  p_provider_payment_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.payment_orders%rowtype;
  v_plan public.plans%rowtype;
  v_subscription_id uuid;
begin
  if p_provider_payment_id is null or length(trim(p_provider_payment_id)) = 0 then
    raise exception 'provider payment ID is required';
  end if;

  select * into v_order
  from public.payment_orders
  where id = p_order_id
  for update;

  if not found then raise exception 'payment order not found'; end if;
  if v_order.status = 'refunded' then raise exception 'refunded order cannot be activated'; end if;

  select * into v_plan from public.plans where id = v_order.plan_id;
  if not found then raise exception 'plan not found'; end if;

  if v_order.status = 'paid' then
    select id into v_subscription_id from public.subscriptions where order_id = v_order.id;
    if v_subscription_id is not null then return v_subscription_id; end if;
  end if;

  update public.payment_orders
  set status = 'paid',
      provider_payment_id = p_provider_payment_id,
      paid_at = coalesce(paid_at, now()),
      updated_at = now()
  where id = v_order.id;

  insert into public.subscriptions (order_id, customer_id, plan_id, starts_at, ends_at)
  values (v_order.id, v_order.customer_id, v_order.plan_id, now(), now() + make_interval(days => v_plan.duration_days))
  on conflict (order_id) do update set order_id = excluded.order_id
  returning id into v_subscription_id;

  update public.customers
  set plan_id = v_order.plan_id,
      active = true,
      started_on = current_date,
      expires_at = now() + make_interval(days => v_plan.duration_days),
      updated_at = now()
  where id = v_order.customer_id;

  return v_subscription_id;
end;
$$;

revoke all on function public.confirm_paid_order(uuid, text) from public, anon, authenticated;
grant execute on function public.confirm_paid_order(uuid, text) to service_role;

comment on function public.confirm_paid_order(uuid, text) is
  'Trusted server only: call after verifying provider webhook signature, payment amount, currency, merchant and order reference. Idempotent subscription activation.';
