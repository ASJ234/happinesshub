import { CreditCard, DollarSign, Gift, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchSubscriptionPlans } from "@/lib/videos";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SubscriptionPanel } from "@/components/subscription/SubscriptionPanel";
import { StatCard } from "@/components/ui/StatCard";
import { GiftTopUpForm } from "@/components/wallet/GiftTopUpForm";
import { money } from "@/lib/wallet";
import { subscriptionState } from "@/lib/subscriptions";

export default async function SubscriptionPage() {
  const user = await requireUser();
  const supabase = await createClient();

  if (user.role === "admin") {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={<CreditCard className="text-primary" size={28} />}
          title="Subscription"
          description="Pick a plan, deposit, and every padlock opens until it expires"
        />
        <Card className="p-6">
          <span className="inline-flex items-center gap-2 text-primary font-medium">
            <ShieldCheck size={18} />
            Free admin access
          </span>
          <p className="text-sm text-muted mt-2">
            You&apos;re an admin — every video is unlocked for you without paying.
          </p>
          <Link
            href="/dashboard/admin"
            className="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline mt-4"
          >
            <DollarSign size={15} />
            Approve customer deposits on the Admin Panel
          </Link>
        </Card>
      </div>
    );
  }

  const [settingsResult, latestResult, plans, giftBalance] = await Promise.all([
    supabase.from("payment_settings").select("*").eq("id", true).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    fetchSubscriptionPlans(supabase),
    supabase.rpc("gift_balance").then(({ data }) => Number(data ?? 0)),
  ]);

  const latest = latestResult.data;
  const state = subscriptionState(latest);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<CreditCard className="text-primary" size={28} />}
        title="Subscription"
        description="Pick a plan, deposit, and every padlock opens until it expires"
      />

      <SubscriptionPanel
        settings={settingsResult.data}
        latest={latest}
        plans={plans}
        state={state}
      />

      <section id="gift-credit" className="scroll-mt-24 space-y-4">
        <h2 className="text-lg font-semibold">Gift credit</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <StatCard label="Gift credit to spend on live streams" value={money(giftBalance)} icon={Gift} />
          <div className="lg:col-span-2">
            <GiftTopUpForm payTo={settingsResult.data} />
          </div>
        </div>
      </section>
    </div>
  );
}