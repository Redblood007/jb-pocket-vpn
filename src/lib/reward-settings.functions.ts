import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { initialRewardSettings, rewardSettingsSchema } from "./reward-settings";

export const getRewardSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !isAdmin) throw new Error("Forbidden");
    const { data, error } = await context.supabase.from("reward_settings")
      .select("data_per_ad_mb, daily_reward_limit, rewards_enabled").eq("id", true).maybeSingle();
    if (error) throw new Error("Could not load reward settings.");
    return rewardSettingsSchema.parse(data ?? initialRewardSettings);
  });

export const saveRewardSettings = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => rewardSettingsSchema.parse(input))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context, data }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || !isAdmin) throw new Error("Forbidden");
    const { data: saved, error } = await context.supabase.from("reward_settings")
      .upsert({ id: true, ...data, rewards_enabled: false, updated_at: new Date().toISOString() })
      .select("data_per_ad_mb, daily_reward_limit, rewards_enabled").single();
    if (error) throw new Error("Could not save reward settings.");
    return rewardSettingsSchema.parse(saved);
  });