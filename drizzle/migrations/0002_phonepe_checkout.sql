-- PhonePe Standard Checkout V2 linkage and customer ownership.
alter table public.customers
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;
create unique index if not exists customers_auth_user_id_uidx
  on public.customers(auth_user_id) where auth_user_id is not null;

alter table public.payment_orders
  add column if not exists checkout_url text;

create index if not exists payment_orders_customer_created_idx
  on public.payment_orders(customer_id, created_at desc);

comment on column public.payment_orders.checkout_url is
  'PhonePe hosted checkout redirect URL; never a payment confirmation signal.';
