import Link from "next/link";
import { Radio, Users } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { liveCreatorLabel, liveStatusLabel, type LiveStreamRow } from "@/lib/live";

export function LiveStreamCard({ stream }: { stream: LiveStreamRow }) {
  const isLive = stream.status === "live";

  return (
    <Link
      href={`/dashboard/live/${stream.id}`}
      className="group bg-surface border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors"
    >
      <div className="relative aspect-video bg-gradient-to-br from-primary/25 to-accent-red/20 flex items-center justify-center">
        {isLive && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            LIVE
          </span>
        )}
        <Radio size={32} className="text-white/40" />
        {stream.viewers > 0 && (
          <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded flex items-center gap-1">
            <Users size={11} />
            {stream.viewers}
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
          {stream.title}
        </h3>
        <p className="text-xs text-muted mt-1">{liveCreatorLabel(stream)}</p>
        <div className="mt-2">
          <StatusBadge status={liveStatusLabel(stream.status)} />
        </div>
      </div>
    </Link>
  );
}
