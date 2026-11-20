"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cameFromInsideSite } from "@/lib/nav-history";

interface BackButtonProps {
  /** Where to go when there's no page of ours to go back to. */
  fallbackHref: string;
}

/**
 * Goes back to the page the viewer came from, on the same page number and
 * scrolled to where they were, so the video they opened is in view again.
 * A video opened from a shared link has no such page, so it goes to the
 * fallback instead.
 */
export function BackButton({ fallbackHref }: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (cameFromInsideSite()) router.back();
        else router.push(fallbackHref);
      }}
      className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
    >
      <ArrowLeft size={14} />
      Back
    </button>
  );
}
