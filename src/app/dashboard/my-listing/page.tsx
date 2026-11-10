import { Contact } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListingManager } from "@/components/listings/ListingManager";
import {
  fetchListings,
  listingCategoriesForRole,
  toManagedListing,
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

  const managed = await Promise.all(
    listings.map((listing) => toManagedListing(supabase, listing))
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
