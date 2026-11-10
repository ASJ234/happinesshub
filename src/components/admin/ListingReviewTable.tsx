"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, X } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getCategory } from "@/lib/categories";
import { reviewListing } from "@/lib/listing-actions";
import type { ListingPhoto, VerificationStatus } from "@/lib/listings";

export interface AdminListingRow {
  id: string;
  category: string;
  display_name: string;
  description: string | null;
  verification_status: VerificationStatus;
  created_at: string;
  creator: { username: string; display_name: string | null } | null;
  photos: ListingPhoto[];
  photoUrls: Record<string, string>;
  hasBody: boolean;
  hasFace: boolean;
}

interface ListingReviewTableProps {
  listings: AdminListingRow[];
}

export function ListingReviewTable({ listings }: ListingReviewTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState(listings);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function review(listing: AdminListingRow, action: "approve" | "reject") {
    setBusyId(listing.id);
    setMessage(null);

    const problem = await reviewListing(listing.id, action);
    setBusyId(null);

    if (problem) {
      setMessage(problem);
      return;
    }

    setRows((prev) =>
      prev.map((row) =>
        row.id === listing.id
          ? {
              ...row,
              verification_status:
                action === "approve" ? "approved" : "rejected",
            }
          : row
      )
    );
    setMessage(
      action === "approve"
        ? `Approved ${listing.display_name}`
        : `Rejected ${listing.display_name}`
    );
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        No profiles are waiting for verification.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      {message && <p className="px-4 pt-3 text-xs text-muted">{message}</p>}
      <table className="w-full text-sm min-w-[820px]">
        <thead>
          <tr className="border-b border-border text-muted text-left">
            <th className="p-4 font-medium">Profile</th>
            <th className="p-4 font-medium">Owner</th>
            <th className="p-4 font-medium">Verification photos</th>
            <th className="p-4 font-medium">Status</th>
            <th className="p-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((listing) => {
            const category = getCategory(listing.category);
            const needsPhotos =
              listing.category === "masseuse" || listing.category === "hookups";

            return (
              <tr
                key={listing.id}
                className="border-b border-border last:border-0 hover:bg-surface-elevated align-top"
              >
                <td className="p-4">
                  <p className="font-medium">{listing.display_name}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {category?.label ?? listing.category}
                  </p>
                  {listing.description && (
                    <p className="text-xs text-muted mt-1 max-w-56 line-clamp-2">
                      {listing.description}
                    </p>
                  )}
                </td>
                <td className="p-4 text-muted">
                  {listing.creator?.display_name ||
                    listing.creator?.username ||
                    "Unknown"}
                </td>
                <td className="p-4">
                  {listing.photos.length === 0 ? (
                    <span className="text-xs text-muted">No photos</span>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {listing.photos.map((photo) => {
                        const url = listing.photoUrls[photo.path];
                        return (
                          <a
                            key={photo.id}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="w-16 h-16 rounded-lg overflow-hidden border border-border bg-surface-elevated flex items-center justify-center text-[10px] text-muted"
                          >
                            {url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={url}
                                alt={photo.kind}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              photo.kind
                            )}
                          </a>
                        );
                      })}
                    </div>
                  )}
                  {needsPhotos && (
                    <p className="text-xs text-muted mt-1.5">
                      Body {listing.hasBody ? "✓" : "✗"} · Face{" "}
                      {listing.hasFace ? "✓" : "✗"}
                    </p>
                  )}
                </td>
                <td className="p-4">
                  <StatusBadge
                    status={
                      listing.verification_status === "approved"
                        ? "Approved"
                        : listing.verification_status === "rejected"
                          ? "Rejected"
                          : "Pending review"
                    }
                  />
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => review(listing, "approve")}
                      disabled={busyId === listing.id}
                      className="inline-flex items-center gap-1 text-xs text-green-400 hover:text-green-300 font-medium disabled:opacity-50"
                    >
                      <Check size={13} />
                      Approve
                    </button>
                    <button
                      onClick={() => review(listing, "reject")}
                      disabled={busyId === listing.id}
                      className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
                    >
                      <X size={13} />
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="px-4 py-3 text-xs text-muted flex items-center gap-1.5">
        <Eye size={12} />
        Click a photo to open it full size
      </p>
    </div>
  );
}
