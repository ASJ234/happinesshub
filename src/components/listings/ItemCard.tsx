import type { ReactNode } from "react";
import { formatUgx } from "@/lib/videos";

interface ItemCardProps {
  photoUrl: string;
  title: string | null;
  priceUgx: number | null;
  description?: string | null;
  /** A line under the price, e.g. the shop name. */
  byline?: ReactNode;
  /** Pinned to the bottom of the card, e.g. a Buy button. */
  footer?: ReactNode;
  /** Placed over the photo's top-right corner, e.g. a remove button. */
  corner?: ReactNode;
  compact?: boolean;
}

/** A service or product: photo, name, price and description. */
export function ItemCard({
  photoUrl,
  title,
  priceUgx,
  description,
  byline,
  footer,
  corner,
  compact = false,
}: ItemCardProps) {
  return (
    <div className="relative bg-surface border border-border rounded-xl overflow-hidden flex flex-col">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl}
        alt={title ?? ""}
        className="w-full aspect-square object-cover"
      />
      {corner && <div className="absolute top-1.5 right-1.5">{corner}</div>}

      <div className={`flex-1 flex flex-col gap-1 ${compact ? "p-2" : "p-3 sm:p-4"}`}>
        {title && (
          <h3 className={`font-medium line-clamp-2 ${compact ? "text-xs" : "text-sm"}`}>
            {title}
          </h3>
        )}
        {priceUgx !== null && (
          <p className={`text-primary font-semibold ${compact ? "text-xs" : "text-sm"}`}>
            {formatUgx(priceUgx)}
          </p>
        )}
        {byline}
        {description && (
          <p
            className={`text-muted whitespace-pre-line ${
              compact ? "text-[11px] line-clamp-2" : "text-sm"
            }`}
          >
            {description}
          </p>
        )}
        {footer && <div className="pt-2 mt-auto">{footer}</div>}
      </div>
    </div>
  );
}
