CREATE TABLE public.reward_settings (
 id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
 data_per_ad_mb integer NOT NULL DEFAULT 0 CHECK (data_per_ad_mb >= 0),
 daily_reward_limit integer NOT NULL DEFAULT 0 CHECK (daily_reward_limit >= 0),
 rewards_enabled boolean NOT NULL DEFAULT false CHECK (rewards_enabled = false),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reward_settings TO authenticated;
GRANT ALL ON public.reward_settings TO service_role;
ALTER TABLE public.reward_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read reward settings" ON public.reward_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert reward settings" ON public.reward_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update reward settings" ON public.reward_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
COMMENT ON COLUMN public.reward_settings.rewards_enabled IS 'Locked false until real VPN provisioning and verified ad callbacks are implemented; remove the lock only with verified integrations.';