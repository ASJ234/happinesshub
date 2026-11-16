"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import { useConfirm } from "@/components/ui/useConfirm";
import type { PichaPhoto } from "@/lib/picha";

interface PhotoLightboxProps {
  photos: PichaPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  canDelete: (photo: PichaPhoto) => boolean;
  /** Returns a message when the delete fails. */
  onDelete: (photo: PichaPhoto) => Promise<string | null>;
}

const SWIPE_PX = 50;

/** Full-screen photo viewer: arrows, swipe and keyboard to browse. */
export function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
  canDelete,
  onDelete,
}: PhotoLightboxProps) {
  const photo = photos[index];
  const touchStart = useRef<number | null>(null);
  const { ask, dialog, isOpen: confirming } = useConfirm();
  const [loaded, setLoaded] = useState<string | null>(null);
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (confirming) return; // the dialog handles its own keys
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      if (event.key === "ArrowRight" && index < photos.length - 1) onIndexChange(index + 1);
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [index, photos.length, onClose, onIndexChange, confirming]);

  if (!photo) return null;

  function remove() {
    const target = photo;
    ask({
      title: "Delete this photo?",
      description: "It will be removed from Picha for everyone. This can't be undone.",
      confirmLabel: "Delete photo",
      refresh: false, // the gallery removes it straight away
      action: () => onDelete(target),
    });
  }

  const navButton =
    "absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-[90] bg-black/95 flex flex-col"
      onTouchStart={(e) => (touchStart.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStart.current === null || confirming) return;
        const delta = e.changedTouches[0].clientX - touchStart.current;
        touchStart.current = null;
        if (delta > SWIPE_PX && hasPrev) onIndexChange(index - 1);
        if (delta < -SWIPE_PX && hasNext) onIndexChange(index + 1);
      }}
    >
      {dialog}
      <div className="flex items-center gap-3 px-4 h-14 text-white shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{photo.uploader}</p>
          <p className="text-xs text-white/60">
            {index + 1} of {photos.length}
          </p>
        </div>
        {canDelete(photo) && (
          <button
            onClick={remove}
            aria-label="Delete photo"
            className="p-2 rounded-full hover:bg-white/10 text-red-400"
          >
            <Trash2 size={20} />
          </button>
        )}
        <button
          onClick={onClose}
          aria-label="Close"
          className="p-2 rounded-full hover:bg-white/10"
        >
          <X size={22} />
        </button>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center px-2 pb-4">
        {loaded !== photo.id && (
          // The preview shows at once while the full photo loads.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.thumbUrl}
            alt=""
            aria-hidden="true"
            className="absolute max-w-full max-h-full object-contain blur-sm opacity-60"
          />
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={photo.url}
          alt={`Photo by ${photo.uploader}`}
          onLoad={() => setLoaded(photo.id)}
          className="relative max-w-full max-h-full object-contain select-none"
          draggable={false}
        />

        {hasPrev && (
          <button
            onClick={() => onIndexChange(index - 1)}
            aria-label="Previous photo"
            className={`${navButton} left-3 hidden sm:flex`}
          >
            <ChevronLeft size={24} />
          </button>
        )}
        {hasNext && (
          <button
            onClick={() => onIndexChange(index + 1)}
            aria-label="Next photo"
            className={`${navButton} right-3 hidden sm:flex`}
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>
    </div>
  );
}
