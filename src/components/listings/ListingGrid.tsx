import { Lock, MapPin, Phone } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  contactIsVisible,
  listingOwnerLabel,
  listingPhotoUrls,
  type ListingRow,
} from "@/lib/listings";

interface ListingCardProps {
  listing: ListingRow;
  supabase: SupabaseClient;
  viewerId?: string;
  viewerRole?: string;
}

export function ListingCard({
  listing,
  supabase,
  viewerId,
  viewerRole,
}: ListingCardProps) {
  const photos = listingPhotoUrls(supabase, listing);
  const cover = photos[0];
  const showContact = contactIsVisible(listing, viewerId, viewerRole);

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="relative aspect-video bg-gradient-to-br from-primary/30 to-accent-red/30">
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={listing.display_name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}
        <div className="absolute top-2 left-2">
          <VerifiedBadge status={listing.verification_status} />
        </div>
      </div>

      <div className="p-3">
        <h3 className="text-sm font-medium line-clamp-1">{listing.display_name}</h3>
        <p className="text-[11px] text-muted mt-0.5 truncate">
          by {listingOwnerLabel(listing)}
        </p>

        {listing.description && (
          <p className="text-xs text-muted mt-2 line-clamp-3">{listing.description}</p>
        )}

        {showContact && listing.contact ? (
          <div className="mt-3 space-y-1.5 text-xs">
            <a
              href={`tel:${listing.contact.phone_number}`}
              className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
            >
              <Phone size={13} className="text-muted shrink-0" />
              {listing.contact.phone_number}
            </a>
            {listing.contact.address && (
              <p className="flex items-start gap-2 text-muted">
                <MapPin size={13} className="shrink-0 mt-0.5" />
                {listing.contact.address}
              </p>
            )}
          </div>
        ) : (
          <p className="mt-3 flex items-center gap-2 text-[11px] text-muted">
            <Lock size={12} />
            Contact details unlock once this profile is verified
          </p>
        )}
      </div>
    </div>
  );
}

interface ListingGridProps {
  listings: ListingRow[];
  supabase: SupabaseClient;
  viewerId?: string;
  viewerRole?: string;
  emptyMessage?: string;
}

export function ListingGrid({
  listings,
  supabase,
  viewerId,
  viewerRole,
  emptyMessage = "No profiles here yet. Check back soon.",
}: ListingGridProps) {
  if (listings.length === 0) {
    return (
      <EmptyState>{emptyMessage}</EmptyState>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          supabase={supabase}
          viewerId={viewerId}
          viewerRole={viewerRole}
        />
      ))}
    </div>
  );
}
