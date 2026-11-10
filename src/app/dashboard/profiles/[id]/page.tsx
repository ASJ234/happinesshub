import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Pencil, Phone } from "lucide-react";
import { BuyButton } from "@/components/listings/BuyButton";
import { ItemCard } from "@/components/listings/ItemCard";
import { ProfileAvatar } from "@/components/listings/ProfileAvatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { requireUser } from "@/lib/auth";
import { getCategory } from "@/lib/categories";
import {
  contactIsVisible,
  fetchListing,
  listingAvatarUrl,
  listingPhotoUrls,
  publicPhotoUrl,
} from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";

// A service provider's profile (photos and services) or a vendor's shop
// (products with a Buy button). Unverified profiles are only shown to their
// owner and admins.
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const listing = await fetchListing(supabase, id);
  if (!listing || !contactIsVisible(listing, user.id, user.role)) notFound();

  const category = getCategory(listing.category);
  const isShop = listing.category === "wardrobe";
  const photos = listingPhotoUrls(supabase, listing);
  const phone = listing.contact?.phone_number ?? null;
  // Admins manage any profile; owners manage their own from My Profile.
  const manageHref =
    user.role === "admin"
      ? `/dashboard/admin/listings/${listing.id}`
      : user.id === listing.user_id
        ? "/dashboard/my-listing"
        : null;

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        {category && (
          <Link
            href={category.href}
            className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft size={16} />
            {category.label}
          </Link>
        )}
        {manageHref && (
          <Link
            href={manageHref}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary-hover font-medium"
          >
            <Pencil size={14} />
            Manage
          </Link>
        )}
      </div>

      <div className="bg-surface border border-border rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row gap-5">
        <ProfileAvatar
          src={listingAvatarUrl(supabase, listing)}
          alt={listing.display_name}
          size="xl"
          className="mx-auto sm:mx-0"
        />

        <div className="min-w-0 flex-1 space-y-3 text-center sm:text-left">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <h1 className="text-xl font-semibold">{listing.display_name}</h1>
            {!isShop && <VerifiedBadge status={listing.verification_status} />}
          </div>

          {listing.description && (
            <p className="text-sm text-muted whitespace-pre-line">
              {listing.description}
            </p>
          )}

          {listing.contact && (
            <div className="space-y-1.5 text-sm">
              <a
                href={`tel:${listing.contact.phone_number}`}
                className="inline-flex items-center gap-2 text-foreground hover:text-primary transition-colors"
              >
                <Phone size={15} className="text-muted shrink-0" />
                {listing.contact.phone_number}
              </a>
              {listing.contact.address && (
                <p className="flex items-start gap-2 text-xs text-muted justify-center sm:justify-start">
                  <MapPin size={13} className="shrink-0 mt-0.5" />
                  {listing.contact.address}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {photos.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Photos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl overflow-hidden border border-border bg-surface-elevated"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="w-full aspect-square object-cover hover:opacity-90 transition-opacity"
                />
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">{isShop ? "Products" : "Services"}</h2>
        {listing.items.length === 0 ? (
          <EmptyState>
            {isShop ? "No products yet." : "No services listed yet."}
          </EmptyState>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {listing.items.map((item) => (
              <ItemCard
                key={item.id}
                photoUrl={publicPhotoUrl(supabase, item.photo_path)}
                title={item.title}
                priceUgx={item.price_ugx}
                description={item.description}
                footer={
                  isShop && (
                    <BuyButton
                      productName={item.title ?? "this product"}
                      sellerName={listing.display_name}
                      phoneNumber={phone}
                    />
                  )
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
