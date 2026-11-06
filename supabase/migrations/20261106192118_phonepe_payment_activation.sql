create or replace function public.activate_phonepe_subscription(
  p_order_reference text,
  p_provider_payment_id text,
  p_paid_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.payment_orders%rowtype;
  v_duration integer;
  v_start timestamptz;
  v_end timestamptz;
begin
  select * into v_order
  from public.payment_orders
  where order_reference = p_order_reference
    and provider = 'phonepe'
  for update;

  if not found then
    raise exception 'Payment order not found';
  end if;

  if v_order.status = 'paid' then
    return jsonb_build_object('status','paid','order_id',v_order.id,'already_processed',true);
  end if;

  if v_order.status <> 'pending' then
    raise exception 'Payment order is not pending';
  end if;

  select duration_days into v_duration
  from public.plans where id = v_order.plan_id;

  if v_duration is null or v_duration < 1 then
    raise exception 'Plan duration is invalid';
  end if;

  select greatest(now(), coalesce(expires_at, now())) into v_start
  from public.customers where id = v_order.customer_id for update;

  v_end := v_start + make_interval(days => v_duration);

  update public.payment_orders
  set status = 'paid',
      provider_payment_id = coalesce(provider_payment_id, p_provider_payment_id),
      paid_at = coalesce(p_paid_at, now()),
      updated_at = now()
  where id = v_order.id;

  insert into public.subscriptions(order_id, customer_id, plan_id, status, starts_at, ends_at)
  values (v_order.id, v_order.customer_id, v_order.plan_id, 'active', v_start, v_end)
  on conflict (order_id) do nothing;

  update public.customers
  set plan_id = v_order.plan_id,
      active = true,
      started_on = (v_start at time zone 'UTC')::date,
      expires_at = v_end,
      updated_at = now()
  where id = v_order.customer_id;

  return jsonb_build_object('status','paid','order_id',v_order.id,'starts_at',v_start,'ends_at',v_end,'already_processed',false);
end;
$$;

revoke all on function public.activate_phonepe_subscription(text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.activate_phonepe_subscription(text,text,timestamptz) to service_role;
