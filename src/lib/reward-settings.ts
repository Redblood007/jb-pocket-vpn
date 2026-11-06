import { z } from "zod";

export const rewardSettingsSchema = z.object({
  data_per_ad_mb: z.number().int().min(0).max(2147483647),
  daily_reward_limit: z.number().int().min(0).max(2147483647),
  rewards_enabled: z.literal(false).default(false),
}).strict();

export type RewardSettings = z.infer<typeof rewardSettingsSchema>;
export const initialRewardSettings: RewardSettings = {
  data_per_ad_mb: 0,
  daily_reward_limit: 0,
  rewards_enabled: false,
};