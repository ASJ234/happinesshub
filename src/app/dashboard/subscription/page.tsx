import { CreditCard, DollarSign, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchSubscriptionPlans } from "@/lib/videos";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { SubscriptionPanel, type SubscriptionState } from "@/components/subscription/SubscriptionPanel";

interface SubscriptionShape {
  status: string | null;
  expires_at: string | null;
}

function subscriptionState(latest: SubscriptionShape | null): SubscriptionState {
  if (!latest?.status || latest.status === "pending") {
    return (latest?.status as SubscriptionState) ?? "none";
  }
  if (latest.status === "active") {
    const expiresAt = latest.expires_at ? new Date(latest.expires_at) : null;
    return expiresAt === null || expiresAt.getTime() > Date.now()
      ? "active"
      : "expired";
  }
  return "rejected";
}

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

  const [settingsResult, latestResult, plans] = await Promise.all([
    supabase.from("payment_settings").select("*").eq("id", true).maybeSingle(),
    supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    fetchSubscriptionPlans(supabase),
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
    </div>
  );
}