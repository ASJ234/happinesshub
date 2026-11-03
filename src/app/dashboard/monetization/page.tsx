import { Wallet } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { WalletPanel } from "@/components/wallet/WalletPanel";
import {
  fetchTransactions,
  fetchWallet,
  fetchWithdrawals,
} from "@/lib/wallet";

export default async function MonetizationPage() {
  const user = await requireRole("creator", "admin");

  const supabase = await createClient();

  const [wallet, transactions, withdrawals, settings, giftBalance] =
    await Promise.all([
      fetchWallet(supabase, user.id),
      fetchTransactions(supabase, user.id),
      fetchWithdrawals(supabase, user.id),
      supabase
        .from("app_settings")
        .select("payout_method, payout_account")
        .eq("id", true)
        .maybeSingle(),
      supabase.rpc("gift_balance").then(({ data }) => Number(data ?? 0)),
    ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Wallet className="text-primary" size={28} />}
        title="Wallet"
        description="Track your earnings, withdraw money and top up gift credit"
      />

      <WalletPanel
        balance={wallet.balance}
        lifetimeEarnings={wallet.lifetimeEarnings}
        transactions={transactions}
        withdrawals={withdrawals}
        payoutMethod={settings.data?.payout_method ?? "mtn"}
        payoutAccount={settings.data?.payout_account ?? ""}
        giftBalance={giftBalance}
      />
    </div>
  );
}
