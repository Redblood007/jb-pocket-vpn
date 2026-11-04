-- Manual UPI checkout: static VPA QR + customer UTR submission + admin reconciliation.
-- A QR scan or client redirect is NOT payment confirmation. Only an admin who has
-- reconciled the bank statement can approve an order and activate its subscription.

alter table public.payment_orders
  add column if not exists utr_reference text,
  add column if not exists submitted_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_note text;

create unique index if not exists payment_orders_utr_reference_uidx
  on public.payment_orders (utr_reference)
  where utr_reference is not null;

create or replace function public.submit_manual_upi_payment(
  p_order_reference text,
  p_utr_reference text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_auth_user_id uuid;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_utr_reference is null or length(trim(p_utr_reference)) < 8 or length(trim(p_utr_reference)) > 64 then
    raise exception 'enter a valid UPI transaction reference';
  end if;

  select customer_id into v_customer_id
  from public.payment_orders
  where order_reference = p_order_reference
    and status = 'pending'
    and expires_at > now()
  for update;

  if not found then raise exception 'pending payment order not found or expired'; end if;

  select auth_user_id into v_auth_user_id
  from public.customers where id = v_customer_id;

  if v_auth_user_id is distinct from auth.uid() then
    raise exception 'payment order does not belong to this account';
  end if;

  update public.payment_orders
  set utr_reference = upper(trim(p_utr_reference)),
      submitted_at = now(),
      updated_at = now()
  where order_reference = p_order_reference;
end;
$$;

create or replace function public.admin_approve_manual_upi_payment(
  p_order_reference text,
  p_review_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.payment_orders%rowtype;
  v_subscription_id uuid;
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'admin access required';
  end if;

  select * into v_order
  from public.payment_orders
  where order_reference = p_order_reference
    and provider = 'manual'
    and status = 'pending'
    and utr_reference is not null
  for update;

  if not found then raise exception 'submitted manual UPI order not found'; end if;

  update public.payment_orders
  set reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = left(coalesce(p_review_note, 'Bank statement reconciled by admin'), 500),
      provider_payment_id = 'UPI-' || v_order.utr_reference,
      updated_at = now()
  where id = v_order.id;

  v_subscription_id := public.confirm_paid_order(v_order.id, 'UPI-' || v_order.utr_reference);
  return v_subscription_id;
end;
$$;

revoke all on function public.submit_manual_upi_payment(text, text) from public, anon;
grant execute on function public.submit_manual_upi_payment(text, text) to authenticated;
revoke all on function public.admin_approve_manual_upi_payment(text, text) from public, anon;
grant execute on function public.admin_approve_manual_upi_payment(text, text) to authenticated;

comment on function public.admin_approve_manual_upi_payment(text, text) is
  'Admin-only manual reconciliation. Approve only after matching the UTR and exact amount in the bank/UPI statement.';
