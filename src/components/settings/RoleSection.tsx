"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Clapperboard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS, type User } from "@/lib/roles";

interface RoleSectionProps {
  user: User;
}

export function RoleSection({ user }: RoleSectionProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function becomeCreator() {
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: "creator" })
      .eq("id", user.id);

    setBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.refresh();
  }

  if (user.role !== "viewer") {
    return (
      <div className="flex items-center gap-2">
        <span className="bg-primary/20 text-primary text-sm font-medium px-3 py-1.5 rounded-lg">
          {ROLE_LABELS[user.role]}
        </span>
        {user.role === "creator" && (
          <Link
            href="/dashboard/upload"
            className="text-xs text-primary hover:text-primary-hover font-medium"
          >
            Upload a video
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="bg-primary/20 text-primary text-sm font-medium px-3 py-1.5 rounded-lg">
          {ROLE_LABELS[user.role]}
        </span>
        <span className="text-xs text-muted">Watching only</span>
      </div>

      <div className="bg-surface-elevated border border-border rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
            <Clapperboard size={17} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">Become a Creator</p>
            <p className="text-xs text-muted mt-0.5">
              Upload your own videos, see their views, and manage your content.
              Your own uploads stay free for you.
            </p>
          </div>
        </div>

        {error && (
          <p className="flex items-start gap-1.5 text-xs text-red-400 mt-3">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            {error}
          </p>
        )}

        <button
          onClick={becomeCreator}
          disabled={busy}
          className="mt-3 w-full bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-60"
        >
          {busy ? "Upgrading..." : "Switch to Creator"}
        </button>
      </div>
    </div>
  );
}
