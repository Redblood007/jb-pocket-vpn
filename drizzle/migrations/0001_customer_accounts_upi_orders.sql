-- Customer self-service accounts and safe UPI payment-order tracking.
-- Payment orders remain pending until a trusted gateway webhook or an admin confirms payment.
create table public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  amount_inr integer not null check (amount_inr > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  upi_reference text not null unique,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired')),
  provider text not null default 'upi_intent',
  provider_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 minutes')
);

alter table public.payment_orders enable row level security;
grant select, insert on public.payment_orders to authenticated;
grant select, update on public.payment_orders to service_role;
grant all on public.payment_orders to service_role;

create policy "Customers can view their own payment orders"
  on public.payment_orders for select
  to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create policy "Customers can create pending orders at the published plan price"
  on public.payment_orders for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and exists (
      select 1 from public.plans p
      where p.id = plan_id and p.price_inr = amount_inr
    )
  );

create policy "Admins can confirm or update payment orders"
  on public.payment_orders for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create index payment_orders_user_created_idx
  on public.payment_orders (user_id, created_at desc);
