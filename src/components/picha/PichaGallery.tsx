"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { PICHA_PAGE_SIZE, type PichaPhoto } from "@/lib/picha";
import { sendDelete } from "@/lib/fetch-error";
import { PhotoLightbox } from "./PhotoLightbox";

interface PichaGalleryProps {
  initialPhotos: PichaPhoto[];
  viewerId: string;
  viewerIsAdmin: boolean;
}

/** The Picha photo wall: a grid that loads more as you scroll. */
export function PichaGallery({ initialPhotos, viewerId, viewerIsAdmin }: PichaGalleryProps) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialPhotos.length >= PICHA_PAGE_SIZE);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    const last = photos[photos.length - 1];
    if (!last || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const response = await fetch(
      `/api/picha?before=${encodeURIComponent(last.createdAt)}`
    ).catch(() => null);
    const body = await response?.json().catch(() => null);
    const next: PichaPhoto[] = body?.photos ?? [];
    setPhotos((current) => {
      const seen = new Set(current.map((p) => p.id));
      return [...current, ...next.filter((p) => !seen.has(p.id))];
    });
    setHasMore(Boolean(response?.ok) && next.length >= PICHA_PAGE_SIZE);
    setLoadingMore(false);
  }, [photos, loadingMore, hasMore]);

  // Loads the next page when the bottom of the grid scrolls into view.
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && loadMore(),
      { rootMargin: "600px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  // Browsing near the end of the loaded photos in the viewer fetches more.
  function showPhoto(index: number) {
    setOpenIndex(index);
    if (index >= photos.length - 3) loadMore();
  }

  const canDelete = useCallback(
    (photo: PichaPhoto) => viewerIsAdmin || photo.userId === viewerId,
    [viewerId, viewerIsAdmin]
  );

  async function deletePhoto(photo: PichaPhoto): Promise<string | null> {
    const problem = await sendDelete(`/api/picha/${photo.id}`, "Could not delete the photo");
    if (problem) return problem;
    const remaining = photos.filter((p) => p.id !== photo.id);
    setPhotos(remaining);
    setOpenIndex((index) =>
      index === null || remaining.length === 0 ? null : Math.min(index, remaining.length - 1)
    );
    return null;
  }

  if (photos.length === 0) {
    return (
      <EmptyState icon={ImageIcon}>No photos yet. Photos posted to Picha will appear here.</EmptyState>
    );
  }

  return (
    <>
      <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-2 sm:gap-3">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => showPhoto(index)}
            className="group relative block w-full mb-2 sm:mb-3 overflow-hidden rounded-lg bg-surface-elevated break-inside-avoid focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            style={
              photo.width && photo.height
                ? { aspectRatio: `${photo.width} / ${photo.height}` }
                : undefined
            }
            aria-label={`Open photo by ${photo.uploader}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.thumbUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </button>
        ))}
      </div>

      <div ref={sentinel} className="flex justify-center py-6">
        {loadingMore && <Spinner size={22} className="text-muted" />}
        {!hasMore && photos.length > PICHA_PAGE_SIZE && (
          <p className="text-xs text-muted">You&apos;ve seen every photo.</p>
        )}
      </div>

      {openIndex !== null && (
        <PhotoLightbox
          photos={photos}
          index={openIndex}
          onIndexChange={showPhoto}
          onClose={() => setOpenIndex(null)}
          canDelete={canDelete}
          onDelete={deletePhoto}
        />
      )}
    </>
  );
}
