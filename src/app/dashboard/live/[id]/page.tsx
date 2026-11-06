import { notFound } from "next/navigation";
import { Radio } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LiveViewer } from "@/components/live/LiveViewer";
import { fetchChatMessages, fetchLiveGifts } from "@/lib/live";

export default async function LiveStreamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("live_streams")
    .select(
      "id, creator_id, title, description, status, provider, provider_session_id, mux_playback_id, scheduled_for, started_at, ended_at, viewers, gift_total, review_note, created_at, creator:creator_id(username, display_name)"
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const stream = {
    ...(data as unknown as {
      id: string;
      creator_id: string;
      title: string;
      description: string | null;
      status: "pending" | "approved" | "rejected" | "live" | "ended";
      provider: string;
      provider_session_id: string | null;
      mux_playback_id: string | null;
      scheduled_for: string | null;
      started_at: string | null;
      ended_at: string | null;
      viewers: number;
      gift_total: number;
      review_note: string | null;
      created_at: string;
    }),
    creator: null as { username: string; display_name: string | null } | null,
  };

  // A stream is only visible once it is approved, or to its owner and admins.
  const visible =
    ["approved", "live", "ended"].includes(stream.status) ||
    stream.creator_id === user.id ||
    user.role === "admin";

  if (!visible) {
    notFound();
  }

  const [gifts, messages, balance] = await Promise.all([
    fetchLiveGifts(supabase),
    fetchChatMessages(supabase, id),
    supabase.rpc("gift_balance").then(({ data }) => Number(data ?? 0)),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Radio className="text-primary" size={28} />}
        title="Live"
        description="Watch the stream and send a gift"
      />

      <LiveViewer
        stream={stream}
        gifts={gifts}
        initialMessages={messages}
        giftBalance={balance}
        isOwner={stream.creator_id === user.id}
      />
    </div>
  );
}
