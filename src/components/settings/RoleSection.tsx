"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Clapperboard, HeartHandshake, Store } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS, type Role, type User } from "@/lib/roles";

interface RoleSectionProps {
  user: User;
}

interface RoleOption {
  role: Extract<Role, "creator" | "provider" | "vendor">;
  icon: LucideIcon;
  title: string;
  description: string;
}

const OPTIONS: RoleOption[] = [
  {
    role: "creator",
    icon: Clapperboard,
    title: "Creator",
    description:
      "Upload your own videos and Picha galleries, see their views, and manage your content.",
  },
  {
    role: "provider",
    icon: HeartHandshake,
    title: "Service Provider",
    description:
      "Offer Masseuse or Hookups services. Your profile shows your photo, bio, number and services once an admin verifies it.",
  },
  {
    role: "vendor",
    icon: Store,
    title: "Vendor",
    description:
      "Sell in the Wardrobe. Post product photos with prices; buyers see your number and contact you.",
  },
];

const NEXT_STEP: Partial<Record<Role, { href: string; label: string }>> = {
  creator: { href: "/dashboard/upload", label: "Upload a video" },
  provider: { href: "/dashboard/my-listing", label: "Set up your profile" },
  vendor: { href: "/dashboard/my-listing", label: "Set up your shop" },
};

export function RoleSection({ user }: RoleSectionProps) {
  const router = useRouter();
  const [busy, setBusy] = useState<Role | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function switchTo(role: RoleOption["role"]) {
    const label = ROLE_LABELS[role];
    if (
      !window.confirm(
        `Switch your account to ${label}? Only an admin can change it after this.`
      )
    ) {
      return;
    }

    setBusy(role);
    setError(null);

    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", user.id);

    setBusy(null);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.refresh();
  }

  if (user.role !== "viewer") {
    const next = NEXT_STEP[user.role];
    return (
      <div className="flex items-center gap-2">
        <span className="bg-primary/20 text-primary text-sm font-medium px-3 py-1.5 rounded-lg">
          {ROLE_LABELS[user.role]}
        </span>
        {next && (
          <Link
            href={next.href}
            className="text-xs text-primary hover:text-primary-hover font-medium"
          >
            {next.label}
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

      <p className="text-xs text-muted">
        Want to do more than watch? Pick one account type. You can only choose
        once.
      </p>

      {OPTIONS.map((option) => {
        const Icon = option.icon;
        return (
          <div
            key={option.role}
            className="bg-surface-elevated border border-border rounded-lg p-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <Icon size={17} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">{option.title}</p>
                <p className="text-xs text-muted mt-0.5">{option.description}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => switchTo(option.role)}
              disabled={busy !== null}
              className="mt-3 w-full bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-60"
            >
              {busy === option.role ? "Switching..." : `Become a ${option.title}`}
            </button>
          </div>
        );
      })}

      {error && (
        <p className="flex items-start gap-1.5 text-xs text-red-400">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          {error}
        </p>
      )}
    </div>
  );
}
