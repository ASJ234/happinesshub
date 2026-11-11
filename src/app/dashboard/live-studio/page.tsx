import { requireRole } from "@/lib/auth";
import { Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { LiveStudioPanel } from "@/components/live/LiveStudioPanel";
import { fetchLiveGifts, fetchLiveStreams } from "@/lib/live";

export default async function LiveStudioPage() {
  const user = await requireRole("creator", "admin");

  const supabase = await createClient();
  const [streams, canGoLive, gifts] = await Promise.all([
    fetchLiveStreams(supabase, { creatorId: user.id, limit: 30 }),
    supabase.rpc("can_go_live_today").then(({ data }) => Boolean(data)),
    fetchLiveGifts(supabase),
  ]);

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Radio className="text-primary" size={28} />}
        title="Live Studio"
        description="Ask to go live, then broadcast once an admin approves"
      />

      <LiveStudioPanel
        streams={streams}
        gifts={gifts}
        canGoLiveToday={canGoLive}
        todayLabel={todayLabel}
      />
    </div>
  );
}
