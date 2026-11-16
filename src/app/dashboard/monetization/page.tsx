import { Wallet } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchGiftTopUpState } from "@/lib/gift-topups";
import { PageHeader } from "@/components/ui/PageHeader";
import { WalletPanel } from "@/components/wallet/WalletPanel";
import {
  fetchPayoutAccount,
  fetchTransactions,
  fetchWallet,
  fetchWithdrawals,
} from "@/lib/wallet";

export default async function MonetizationPage() {
  const user = await requireRole("creator", "admin");

  const supabase = await createClient();

  const [wallet, transactions, withdrawals, savedAccount, giftBalance, topUp] =
    await Promise.all([
      fetchWallet(supabase, user.id),
      fetchTransactions(supabase, user.id),
      fetchWithdrawals(supabase, user.id),
      fetchPayoutAccount(supabase, user.id),
      supabase.rpc("gift_balance").then(({ data }) => Number(data ?? 0)),
      fetchGiftTopUpState(supabase, user.id),
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
        savedAccount={savedAccount}
        giftBalance={giftBalance}
        topUp={topUp}
      />
    </div>
  );
}
