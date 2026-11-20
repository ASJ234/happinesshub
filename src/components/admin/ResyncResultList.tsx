import Link from "next/link";
import { DeleteVideoButton } from "@/components/videos/DeleteVideoButton";
import { formatDate } from "@/lib/videos";
import type { BunnyResyncOutcome, BunnyResyncVideo } from "@/lib/bunny-sync";

function outcomeLabel(outcome: BunnyResyncOutcome, progress: number | null): string {
  switch (outcome) {
    case "never_uploaded":
      return "Bunny never got the file; the upload didn't finish";
    case "encoding":
      return progress != null ? `Bunny is encoding (${progress}%)` : "Bunny is encoding";
    case "errored":
      return "Bunny could not process the file";
    case "check_failed":
      return "Couldn't reach Bunny for this one";
    case "ready":
      return "Ready";
  }
}

const outcomeColor: Record<BunnyResyncOutcome, string> = {
  never_uploaded: "text-amber-400",
  encoding: "text-muted",
  errored: "text-red-400",
  check_failed: "text-red-400",
  ready: "text-green-400",
};

/** The videos a Bunny re-check left unready, with what Bunny said about each. */
export function ResyncResultList({ videos }: { videos: BunnyResyncVideo[] }) {
  if (videos.length === 0) return null;

  return (
    <ul className="w-full max-w-md divide-y divide-border border border-border rounded-lg text-left">
      {videos.map((video) => (
        <li key={video.id} className="flex items-start justify-between gap-3 p-2.5">
          <div className="min-w-0">
            <Link
              href={`/dashboard/watch/${video.id}`}
              className="block text-xs font-medium truncate hover:text-primary"
            >
              {video.title}
            </Link>
            <p className={`text-[11px] ${outcomeColor[video.outcome]}`}>
              {outcomeLabel(video.outcome, video.progress)} · uploaded{" "}
              {formatDate(video.createdAt)}
            </p>
          </div>
          <DeleteVideoButton videoId={video.id} title={video.title} />
        </li>
      ))}
    </ul>
  );
}
