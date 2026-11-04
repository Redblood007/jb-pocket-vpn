-- JB Pocket VPN subscription pricing and seat limits.
-- Review plan names in the Supabase Plans table before applying.
update public.plans
set price_inr = 99, devices = 1, updated_at = now()
where lower(name) like '%basic%';

update public.plans
set price_inr = 599, devices = 3, updated_at = now()
where lower(name) like '%pro%' and lower(name) not like '%premium%';

update public.plans
set price_inr = 999, devices = 5, updated_at = now()
where lower(name) like '%premium%';
