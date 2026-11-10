import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight, MapPin, Phone } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  contactIsVisible,
  fetchListings,
  listingAvatarUrl,
} from "@/lib/listings";
import { ProfileAvatar } from "./ProfileAvatar";

interface ProviderFeedProps {
  icon: LucideIcon;
  title: string;
  description: string;
  category: "masseuse" | "hookups";
  emptyMessage: string;
}

/**
 * Masseuse and Hookups: a scrollable list of service-provider profiles with
 * their picture, number and bio. Only verified profiles are listed, plus the
 * viewer's own so they can see how it looks while it waits for review.
 */
export async function ProviderFeed({
  icon: Icon,
  title,
  description,
  category,
  emptyMessage,
}: ProviderFeedProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const listings = (await fetchListings(supabase, { category })).filter(
    (listing) => contactIsVisible(listing, user.id, user.role)
  );

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Icon className="text-primary" size={28} />}
        title={title}
        description={description}
      />

      {listings.length === 0 ? (
        <EmptyState>{emptyMessage}</EmptyState>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {listings.map((listing) => {
            const href = `/dashboard/profiles/${listing.id}`;
            return (
              <div
                key={listing.id}
                className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3 hover:border-primary/50 transition-colors"
              >
                <Link href={href} className="flex items-center gap-3 min-w-0">
                  <ProfileAvatar
                    src={listingAvatarUrl(supabase, listing)}
                    alt={listing.display_name}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium truncate">{listing.display_name}</h3>
                    <VerifiedBadge
                      status={listing.verification_status}
                      className="mt-1"
                    />
                  </div>
                  <ChevronRight size={18} className="text-muted shrink-0" />
                </Link>

                {listing.description && (
                  <p className="text-sm text-muted line-clamp-3 whitespace-pre-line">
                    {listing.description}
                  </p>
                )}

                {listing.contact && (
                  <div className="mt-auto space-y-1.5 text-sm">
                    <a
                      href={`tel:${listing.contact.phone_number}`}
                      className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
                    >
                      <Phone size={14} className="text-muted shrink-0" />
                      {listing.contact.phone_number}
                    </a>
                    {listing.contact.address && (
                      <p className="flex items-start gap-2 text-xs text-muted">
                        <MapPin size={13} className="shrink-0 mt-0.5" />
                        {listing.contact.address}
                      </p>
                    )}
                  </div>
                )}

                <Link
                  href={href}
                  className="text-xs text-primary hover:text-primary-hover font-medium"
                >
                  See photos and services
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
