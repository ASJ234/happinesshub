"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Play, Square } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  LIVE_ALLOWED_WEEKDAYS,
  liveStatusLabel,
  WEEKDAY_NAMES,
  type LiveStreamRow,
} from "@/lib/live";

interface LiveStudioPanelProps {
  streams: LiveStreamRow[];
  canGoLiveToday: boolean;
  todayLabel: string;
}

const inputClass =
  "w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

export function LiveStudioPanel({
  streams,
  canGoLiveToday,
  todayLabel,
}: LiveStudioPanelProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function request() {
    setBusy(true);
    setError(null);
    setNotice(null);

    const response = await fetch("/api/live/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description,
        scheduled_for: date ? new Date(`${date}T18:00:00`).toISOString() : null,
      }),
    });

    const body = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setError(body?.error ?? "Could not send the request");
      return;
    }

    setNotice("Request sent. An admin has to approve it before you can go live.");
    setTitle("");
    setDescription("");
    setDate("");
    router.refresh();
  }

  async function act(stream: LiveStreamRow, action: "start" | "end") {
    setBusy(true);
    setError(null);
    setNotice(null);

    const response = await fetch(`/api/live/${stream.id}/${action}`, {
      method: "POST",
    });

    const body = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setError(body?.error ?? "Could not update the stream");
      return;
    }

    setNotice(action === "start" ? "You are live." : "The stream has ended.");
    router.refresh();
  }

  const selectedDay = date ? new Date(`${date}T00:00:00`).getDay() : null;
  const selectedIsoDay = selectedDay === 0 ? 7 : selectedDay;
  const dayAllowed =
    selectedIsoDay === null || LIVE_ALLOWED_WEEKDAYS.includes(selectedIsoDay);

  return (
    <div className="space-y-6">
      <div
        className={`rounded-xl border px-4 py-3 text-sm ${
          canGoLiveToday
            ? "border-green-500/30 bg-green-500/10 text-green-400"
            : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
        }`}
      >
        {canGoLiveToday
          ? `Today (${todayLabel}) is a live day. Approved streams can go live right now.`
          : `Today (${todayLabel}) is not a live day. You can go live on ${LIVE_ALLOWED_WEEKDAYS.map(
              (day) => WEEKDAY_NAMES[day - 1]
            ).join(", ")}.`}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {notice && <p className="text-sm text-green-400">{notice}</p>}

      <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="font-semibold">Ask to go live</h2>
          <p className="text-xs text-muted mt-0.5">
            An admin approves every request before you can broadcast.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-sm text-muted block mb-1.5">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-sm text-muted block mb-1.5">
              Description <span className="text-xs">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={`${inputClass} resize-y`}
            />
          </div>
          <div>
            <label className="text-sm text-muted block mb-1.5">
              Planned day <span className="text-xs">(optional)</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
            {!dayAllowed && (
              <p className="text-xs text-red-400 mt-1.5">
                Going live is not allowed on that day.
              </p>
            )}
          </div>
        </div>

        <button
          onClick={request}
          disabled={busy || !title.trim() || !dayAllowed}
          className="bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          {busy ? "Sending..." : "Send request"}
        </button>
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
        <h2 className="font-semibold">My broadcasts</h2>

        {streams.length === 0 ? (
          <p className="text-sm text-muted">
            You have not asked to go live yet.
          </p>
        ) : (
          streams.map((stream) => (
            <div
              key={stream.id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border last:border-0 pb-3 last:pb-0"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{stream.title}</p>
                <p className="text-xs text-muted mt-0.5 flex items-center gap-2">
                  <StatusBadge status={liveStatusLabel(stream.status)} />
                  {stream.gift_total > 0 && (
                    <span>${stream.gift_total.toFixed(2)} in gifts</span>
                  )}
                  {stream.scheduled_for && (
                    <span className="flex items-center gap-1">
                      <CalendarClock size={11} />
                      {new Date(stream.scheduled_for).toLocaleDateString()}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {stream.status === "approved" && (
                  <button
                    onClick={() => act(stream, "start")}
                    disabled={busy || !canGoLiveToday}
                    className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50"
                    title={
                      canGoLiveToday
                        ? "Start the broadcast"
                        : "Not a live day"
                    }
                  >
                    <Play size={13} />
                    Go live
                  </button>
                )}
                {stream.status === "live" && (
                  <button
                    onClick={() => act(stream, "end")}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 bg-surface-elevated hover:bg-border text-white text-xs font-medium px-3 py-2 rounded-lg disabled:opacity-50"
                  >
                    <Square size={13} />
                    End stream
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
