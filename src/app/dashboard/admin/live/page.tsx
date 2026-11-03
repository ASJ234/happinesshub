import { Gift, Radio } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { LiveRequestTable } from "@/components/admin/LiveRequestTable";
import {
  GiftDepositTable,
  type GiftDepositRow,
} from "@/components/admin/GiftDepositTable";
import { fetchLiveStreams } from "@/lib/live";

export default async function AdminLivePage() {
  await requireRole("admin");

  const supabase = await createClient();

  const [streams, depositsRaw] = await Promise.all([
    fetchLiveStreams(supabase, { status: "pending", limit: 50 }),
    supabase
      .from("gift_deposits")
      .select(
        "id, amount, paid_from, reference, note, status, created_at, user:user_id(username, display_name)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ]);

  const deposits = ((depositsRaw.data ?? []) as unknown[]).map((row) => {
    const deposit = row as Omit<GiftDepositRow, "user"> & {
      user: GiftDepositRow["user"] | GiftDepositRow["user"][];
    };
    return {
      ...deposit,
      user: Array.isArray(deposit.user)
        ? (deposit.user[0] ?? null)
        : (deposit.user ?? null),
    };
  }) as GiftDepositRow[];

  const { data: liveNow } = await supabase
    .from("live_streams")
    .select("id")
    .eq("status", "live");

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Radio className="text-primary" size={28} />}
        title="Live Requests"
        description="Approve who is allowed to go live and review gift top-ups"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Waiting for approval"
          value={streams.length.toLocaleString()}
          icon={Radio}
        />
        <StatCard
          label="Live right now"
          value={(liveNow ?? []).length.toLocaleString()}
          icon={Radio}
        />
        <StatCard
          label="Gift top-ups to review"
          value={deposits.length.toLocaleString()}
          icon={Gift}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Requests to go live</h2>
          <p className="text-xs text-muted mt-0.5">
            An approved stream can only start on a live day
          </p>
        </div>
        <LiveRequestTable streams={streams} />
      </Card>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Gift top-ups</h2>
          <p className="text-xs text-muted mt-0.5">
            Approving turns the money into gift credit
          </p>
        </div>
        <GiftDepositTable deposits={deposits} />
      </Card>
    </div>
  );
}
