import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LockKeyhole, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getRewardSettings, saveRewardSettings } from "@/lib/reward-settings.functions";
import { rewardSettingsSchema, type RewardSettings } from "@/lib/reward-settings";

export function RewardSettingsPanel() {
  const load = useServerFn(getRewardSettings);
  const { data, isPending, error, refetch } = useQuery({ queryKey: ["reward-settings"], queryFn: () => load() });
  if (isPending) return <p className="text-muted-foreground">Loading reward settings...</p>;
  if (error || !data) return <div role="alert" className="space-y-3"><p className="text-destructive">Could not load reward settings.</p><Button variant="outline" onClick={() => refetch()}>Try again</Button></div>;
  return <RewardSettingsForm settings={data} />;
}

function RewardSettingsForm({ settings }: { settings: RewardSettings }) {
  const [dataMb, setDataMb] = useState(String(settings.data_per_ad_mb));
  const [dailyLimit, setDailyLimit] = useState(String(settings.daily_reward_limit));
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: useServerFn(saveRewardSettings),
    onSuccess: (saved) => {
      queryClient.setQueryData(["reward-settings"], saved);
      toast.success("Reward settings saved. Rewards remain disabled.");
    },
    onError: () => toast.error("Could not save reward settings. Please try again."),
  });
  return (
    <section className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold">Ad rewards</h1>
      <div className="mt-5 flex items-center gap-2 text-muted-foreground"><LockKeyhole className="size-4" /><span className="font-semibold">Rewards disabled</span></div>
      <dl className="mt-4 grid gap-3 border-y border-border py-4 text-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">VPN service connection</dt><dd className="mt-1">Not ready</dd></div>
        <div><dt className="text-muted-foreground">Ad verification</dt><dd className="mt-1">Not ready</dd></div>
      </dl>
      <form className="mt-6 space-y-5" onSubmit={(event) => {
        event.preventDefault();
        const result = rewardSettingsSchema.safeParse({ data_per_ad_mb: Number(dataMb), daily_reward_limit: Number(dailyLimit), rewards_enabled: false });
        if (!dataMb.trim() || !dailyLimit.trim() || !result.success) {
          toast.error("Enter non-negative whole numbers for both limits.");
          return;
        }
        save.mutate({ data: result.data });
      }}>
        <div><label htmlFor="reward-data" className="mb-2 block text-sm font-medium">Free data per verified ad (MB)</label><input id="reward-data" type="number" min="0" max="2147483647" step="1" required value={dataMb} onChange={(event) => setDataMb(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" /></div>
        <div><label htmlFor="reward-limit" className="mb-2 block text-sm font-medium">Daily reward limit per customer (ads/day)</label><input id="reward-limit" type="number" min="0" max="2147483647" step="1" required value={dailyLimit} onChange={(event) => setDailyLimit(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" /></div>
        <p className="text-sm text-muted-foreground">No data is awarded until VPN service connection and ad verification are ready.</p>
        <Button type="submit" disabled={save.isPending}><Save />{save.isPending ? "Saving..." : "Save reward settings"}</Button>
      </form>
    </section>
  );
}