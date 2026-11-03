import { Contact } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  ListingManager,
  type ManagedListing,
} from "@/components/listings/ListingManager";
import { fetchListings, signedVerificationUrls } from "@/lib/listings";

export default async function MyListingPage() {
  const user = await requireRole("creator");

  const supabase = await createClient();
  const listings = await fetchListings(supabase, { userId: user.id });

  const managed: ManagedListing[] = await Promise.all(
    listings.map(async (listing) => ({
      id: listing.id,
      category: listing.category,
      display_name: listing.display_name,
      description: listing.description,
      verification_status: listing.verification_status,
      review_note: listing.review_note,
      contact: listing.contact,
      photos: listing.photos,
      photoUrls: {
        ...Object.fromEntries(
          listing.photos
            .filter((photo) => photo.bucket === "thumbnails")
            .map((photo) => [
              photo.path,
              supabase.storage
                .from("thumbnails")
                .getPublicUrl(photo.path).data.publicUrl,
            ])
        ),
        ...(await signedVerificationUrls(supabase, listing.photos)),
      },
    }))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Contact className="text-primary" size={28} />}
        title="My Profiles"
        description="Publish your Picha, Wardrobe, Masseuse and Hookups profiles"
      />

      <ListingManager listings={managed} />
    </div>
  );
}
