"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { chipButtonClass } from "@/components/ui/styles";
import { readError } from "@/lib/fetch-error";
import type { BunnyResyncSummary } from "@/lib/bunny-sync";
import { ResyncResultList } from "./ResyncResultList";

interface ResyncVideosButtonProps {
  /** Videos on Bunny that aren't marked ready or errored yet. */
  stuckCount: number;
}

function describe(summary: BunnyResyncSummary): string {
  const parts = [`${summary.ready} now ready`];
  if (summary.neverUploaded) parts.push(`${summary.neverUploaded} never uploaded`);
  if (summary.stillProcessing) parts.push(`${summary.stillProcessing} still encoding`);
  if (summary.errored) parts.push(`${summary.errored} failed on Bunny`);
  if (summary.failed) parts.push(`${summary.failed} couldn't be checked`);
  const text = `Checked ${summary.checked}: ${parts.join(", ")}.`;
  return summary.more ? `${text} More are left; run it again.` : text;
}

export function ResyncVideosButton({ stuckCount }: ResyncVideosButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<BunnyResyncSummary | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const unready = summary?.unready ?? [];
  const message = problem ?? (summary ? describe(summary) : null);

  function removeDeleted(videoId: string) {
    setSummary((current) => {
      if (!current) return current;
      const gone = current.unready.find((video) => video.id === videoId);
      if (!gone) return current;
      const counts = { ...current, checked: current.checked - 1 };
      if (gone.outcome === "never_uploaded") counts.neverUploaded--;
      else if (gone.outcome === "encoding") counts.stillProcessing--;
      else if (gone.outcome === "errored") counts.errored--;
      else if (gone.outcome === "check_failed") counts.failed--;
      const remaining = current.unready.filter((video) => video.id !== videoId);
      // Nothing left to report once the last unready video is deleted.
      if (remaining.length === 0 && counts.ready === 0) return null;
      return { ...counts, unready: remaining };
    });
  }

  if (stuckCount === 0 && !message) {
    return <p className="text-xs text-muted">Every video is synced with Bunny</p>;
  }

  async function resync() {
    setBusy(true);
    setSummary(null);
    setProblem(null);
    try {
      const response = await fetch("/api/admin/videos/resync", { method: "POST" });
      if (response.ok) {
        setSummary((await response.json()) as BunnyResyncSummary);
      } else {
        setProblem(await readError(response, "Could not check the videos with Bunny"));
      }
      router.refresh();
    } catch {
      setProblem("Can't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col items-start gap-1 text-left sm:w-auto sm:items-end sm:text-right">
      {stuckCount > 0 && (
        <button type="button" onClick={resync} disabled={busy} className={chipButtonClass}>
          <RefreshCw size={13} className={busy ? "animate-spin" : undefined} />
          {busy
            ? "Checking with Bunny…"
            : `Re-check ${stuckCount.toLocaleString()} unready video${stuckCount === 1 ? "" : "s"}`}
        </button>
      )}
      {message && <p className="text-xs text-muted max-w-xs">{message}</p>}
      {unready.some((video) => video.outcome === "never_uploaded") && (
        <p className="text-[11px] text-muted max-w-md">
          A video Bunny never got can&apos;t recover by itself. Delete it and
          ask the creator to upload it again.
        </p>
      )}
      <ResyncResultList videos={unready} onDeleted={removeDeleted} />
    </div>
  );
}
