import { requireRole } from "@/lib/auth";
import { Coins, Eye, LayoutDashboard, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { fetchCreatorTotals, formatViews } from "@/lib/videos";
import { fetchWallet, money } from "@/lib/wallet";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";

export default async function CreatorDashboardPage() {
  const user = await requireRole("creator", "admin");
  const supabase = await createClient();

  const [wallet, totals] = await Promise.all([
    fetchWallet(supabase, user.id),
    fetchCreatorTotals(supabase, user.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<LayoutDashboard className="text-primary" size={28} />}
        title="Creator Dashboard"
        description="Overview of your channel performance and earnings"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Wallet Balance" value={money(wallet.balance)} icon={Wallet} />
        <StatCard
          label="Lifetime Earnings"
          value={money(wallet.lifetimeEarnings)}
          icon={Coins}
        />
        <StatCard label="Total Views" value={formatViews(totals.views)} icon={Eye} />
      </div>
    </div>
  );
}
