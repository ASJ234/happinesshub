import { Contact } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListingManager } from "@/components/listings/ListingManager";
import {
  fetchListings,
  listingCategoriesForRole,
  type ManagedListing,
  publicPhotoUrl,
  signedVerificationUrls,
} from "@/lib/listings";

const HEADINGS: Record<string, { title: string; description: string }> = {
  provider: {
    title: "My Profile",
    description:
      "Your Masseuse or Hookups profile: profile picture, bio, number and services",
  },
  vendor: {
    title: "My Shop",
    description: "Your Wardrobe shop: products with prices and your number",
  },
};

export default async function MyListingPage() {
  const user = await requireRole("creator", "provider", "vendor", "admin");

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
      items: listing.items.map((item) => ({
        ...item,
        photoUrl: publicPhotoUrl(supabase, item.photo_path),
      })),
      photoUrls: {
        ...Object.fromEntries(
          listing.photos
            .filter((photo) => photo.bucket === "thumbnails")
            .map((photo) => [photo.path, publicPhotoUrl(supabase, photo.path)])
        ),
        ...(await signedVerificationUrls(supabase, listing.photos)),
      },
    }))
  );

  const heading = HEADINGS[user.role] ?? {
    title: "My Profiles",
    description:
      user.role === "admin"
        ? "Publish profiles in any listing sector"
        : "Publish your Picha gallery",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Contact className="text-primary" size={28} />}
        title={heading.title}
        description={heading.description}
      />

      <ListingManager
        listings={managed}
        role={user.role}
        allowedCategories={listingCategoriesForRole(user.role)}
      />
    </div>
  );
}
