import { describe, expect, it } from "vitest";
import { initialRewardSettings, rewardSettingsSchema } from "@/lib/reward-settings";

describe("Reward configuration", () => {
  it("stores free data per verified ad as whole MB", () => {
    expect(rewardSettingsSchema.parse({ data_per_ad_mb: 100, daily_reward_limit: 3 }).data_per_ad_mb).toBe(100);
    expect(rewardSettingsSchema.safeParse({ data_per_ad_mb: -1, daily_reward_limit: 3 }).success).toBe(false);
  });
  it("stores the daily limit as a whole reward count", () => {
    expect(rewardSettingsSchema.parse({ data_per_ad_mb: 100, daily_reward_limit: 3 }).daily_reward_limit).toBe(3);
    expect(rewardSettingsSchema.safeParse({ data_per_ad_mb: 100, daily_reward_limit: 1.5 }).success).toBe(false);
  });
  it("keeps rewards disabled while integrations are not ready", () => {
    expect(initialRewardSettings.rewards_enabled).toBe(false);
    expect(rewardSettingsSchema.parse({ data_per_ad_mb: 100, daily_reward_limit: 3 }).rewards_enabled).toBe(false);
    expect(rewardSettingsSchema.safeParse({ data_per_ad_mb: 100, daily_reward_limit: 3, rewards_enabled: true }).success).toBe(false);
  });
});