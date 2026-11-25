import { Banknote, CalendarDays, Gift, Lock } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { money } from "@/lib/wallet";
import type { RevenueTotals } from "@/lib/revenue";

/** The admin's "Money collected" row: confirmed payments only. */
export function RevenueStats({ totals }: { totals: RevenueTotals }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold">Money collected</h2>
        <p className="text-xs text-muted mt-0.5">
          Approved subscriptions and gift credit top-ups ·{" "}
          {totals.payments.toLocaleString()} payments
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total collected"
          value={money(totals.total)}
          icon={Banknote}
        />
        <StatCard
          label="This month"
          value={money(totals.thisMonth)}
          icon={CalendarDays}
        />
        <StatCard
          label="From subscriptions"
          value={money(totals.subscriptions)}
          icon={Lock}
        />
        <StatCard
          label="From gift credit"
          value={money(totals.giftCredit)}
          icon={Gift}
        />
      </div>
    </section>
  );
}
