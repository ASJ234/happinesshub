"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Pencil } from "lucide-react";
import { ProfileAvatar } from "@/components/listings/ProfileAvatar";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { LISTING_CATEGORIES } from "@/lib/categories";
import type { VerificationStatus } from "@/lib/listings";
import { ReviewButtons } from "./ReviewButtons";

export interface AdminListingSummary {
  id: string;
  category: string;
  display_name: string;
  verification_status: VerificationStatus;
  owner: string;
  avatarUrl: string | null;
  itemCount: number;
  created_at: string;
}

interface AllListingsTableProps {
  listings: AdminListingSummary[];
}

const ALL = "all";

/** Every profile and shop, filterable by sector, with the admin actions. */
export function AllListingsTable({ listings }: AllListingsTableProps) {
  const [sector, setSector] = useState(ALL);
  const shown =
    sector === ALL ? listings : listings.filter((l) => l.category === sector);

  const tabs = [
    { slug: ALL, label: "All", count: listings.length },
    ...LISTING_CATEGORIES.map((c) => ({
      slug: c.slug,
      label: c.label,
      count: listings.filter((l) => l.category === c.slug).length,
    })),
  ];

  return (
    <div>
      <div className="flex gap-2 flex-wrap p-4 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.slug}
            type="button"
            onClick={() => setSector(tab.slug)}
            aria-pressed={sector === tab.slug}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              sector === tab.slug
                ? "bg-primary text-white border-primary"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-muted">
          No profiles in this sector.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-border text-muted text-left">
                <th className="p-4 font-medium">Profile</th>
                <th className="p-4 font-medium">Owner</th>
                <th className="p-4 font-medium">Services / products</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((listing) => (
                <tr
                  key={listing.id}
                  className="border-b border-border last:border-0 hover:bg-surface-elevated align-top"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <ProfileAvatar
                        src={listing.avatarUrl}
                        alt={listing.display_name}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{listing.display_name}</p>
                        <p className="text-xs text-muted">
                          {LISTING_CATEGORIES.find((c) => c.slug === listing.category)
                            ?.label ?? listing.category}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-muted">{listing.owner}</td>
                  <td className="p-4 text-muted">{listing.itemCount}</td>
                  <td className="p-4">
                    <VerifiedBadge status={listing.verification_status} />
                  </td>
                  <td className="p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/dashboard/admin/listings/${listing.id}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-medium"
                        >
                          <Pencil size={12} />
                          Manage
                        </Link>
                        <Link
                          href={`/dashboard/profiles/${listing.id}`}
                          className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground font-medium"
                        >
                          <ExternalLink size={12} />
                          View
                        </Link>
                      </div>
                      <ReviewButtons
                        listingId={listing.id}
                        status={listing.verification_status}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
