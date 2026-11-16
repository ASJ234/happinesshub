"use client";

import { Banknote, Gift, Wallet } from "lucide-react";
import {
  money,
  transactionLabel,
  type PayoutAccount,
  type WalletTransactionRow,
  type WithdrawalRow,
} from "@/lib/wallet";
import { GiftTopUpForm } from "./GiftTopUpForm";
import { WithdrawForm } from "./WithdrawForm";
import type { GiftTopUpState } from "@/lib/gift-topups";

interface WalletPanelProps {
  balance: number;
  lifetimeEarnings: number;
  transactions: WalletTransactionRow[];
  withdrawals: WithdrawalRow[];
  /** The creator's payout details from their last withdrawal. */
  savedAccount: PayoutAccount | null;
  giftBalance: number;
  topUp: GiftTopUpState;
}


export function WalletPanel({
  balance,
  lifetimeEarnings,
  transactions,
  withdrawals,
  savedAccount,
  giftBalance,
  topUp,
}: WalletPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center mb-3">
            <Wallet size={20} />
          </div>
          <p className="text-2xl font-bold">{money(balance)}</p>
          <p className="text-sm text-muted mt-1">Available balance</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center mb-3">
            <Banknote size={20} />
          </div>
          <p className="text-2xl font-bold">{money(lifetimeEarnings)}</p>
          <p className="text-sm text-muted mt-1">Lifetime earnings</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="w-10 h-10 rounded-lg bg-accent-red/10 text-accent-red flex items-center justify-center mb-3">
            <Gift size={20} />
          </div>
          <p className="text-2xl font-bold">{money(giftBalance)}</p>
          <p className="text-sm text-muted mt-1">Gift credit</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WithdrawForm
          balance={balance}
          savedAccount={savedAccount}
          withdrawals={withdrawals}
        />

        <GiftTopUpForm topUp={topUp} />
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5">
        <h2 className="font-semibold mb-3">Earnings</h2>

        {transactions.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing yet. Earnings show up here as soon as the pool is split or a
            viewer sends a gift.
          </p>
        ) : (
          <div className="space-y-2">
            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between text-sm border-b border-border last:border-0 py-2"
              >
                <div>
                  <p className="font-medium">
                    {transactionLabel(transaction.kind)}
                  </p>
                  <p className="text-xs text-muted">
                    {new Date(transaction.created_at).toLocaleDateString()}
                    {transaction.period ? ` · ${transaction.period}` : ""}
                    {transaction.note ? ` · ${transaction.note}` : ""}
                  </p>
                </div>
                <span
                  className={
                    transaction.amount >= 0
                      ? "text-green-400 font-medium"
                      : "text-red-400 font-medium"
                  }
                >
                  {transaction.amount >= 0 ? "+" : "−"}
                  {money(Math.abs(transaction.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
