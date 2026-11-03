import type { SupabaseClient } from "@supabase/supabase-js";

export type VerificationStatus = "pending" | "approved" | "rejected";

export type ListingPhotoKind = "body" | "face" | "gallery" | "product" | "other";

export interface ListingPhoto {
  id: string;
  listing_id: string;
  path: string;
  kind: ListingPhotoKind;
  bucket: "thumbnails" | "listing-verification";
}

export interface ListingRow {
  id: string;
  user_id: string;
  category: string;
  display_name: string;
  description: string | null;
  verification_status: VerificationStatus;
  review_note: string | null;
  created_at: string;
  /** Null when the contact details are hidden (listing not yet verified). */
  contact: { phone_number: string; address: string | null } | null;
  photos: ListingPhoto[];
  creator: { username: string; display_name: string | null } | null;
}

interface FetchListingsOptions {
  category?: string;
  userId?: string;
  limit?: number;
}

export async function fetchListings(
  supabase: SupabaseClient,
  { category, userId, limit = 60 }: FetchListingsOptions = {}
): Promise<ListingRow[]> {
  let query = supabase
    .from("listings")
    .select(
      "*, contact:listing_contacts(phone_number, address), photos:listing_photos(id, listing_id, path, kind, bucket), creator:user_id(username, display_name)"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category) query = query.eq("category", category);
  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;

  if (error) {
    console.warn(`[listings] fetch failed: ${error.message}`);
    return [];
  }

  return (data ?? []) as ListingRow[];
}

/** Public gallery / product photos, safe to render in an <img src>. */
export function listingPhotoUrls(
  supabase: SupabaseClient,
  listing: ListingRow
): string[] {
  return listing.photos
    .filter((photo) => photo.bucket === "thumbnails")
    .map(
      (photo) => supabase.storage.from("thumbnails").getPublicUrl(photo.path).data.publicUrl
    );
}

/**
 * Signed URLs for the private verification photos. Only the listing owner and
 * admins can read them, so this is used on the owner's listing page and in
 * the admin review queue.
 */
export async function signedVerificationUrls(
  supabase: SupabaseClient,
  photos: ListingPhoto[]
): Promise<Record<string, string>> {
  const privatePhotos = photos.filter(
    (photo) => photo.bucket === "listing-verification"
  );
  if (privatePhotos.length === 0) return {};

  const { data, error } = await supabase.storage
    .from("listing-verification")
    .createSignedUrls(
      privatePhotos.map((photo) => photo.path),
      60 * 30
    );

  if (error || !data) {
    console.warn(`[listings] could not sign photos: ${error?.message}`);
    return {};
  }

  const urls: Record<string, string> = {};
  for (const entry of data) {
    if (entry.signedUrl && entry.path) urls[entry.path] = entry.signedUrl;
  }
  return urls;
}

export function listingOwnerLabel(listing: ListingRow): string {
  return listing.creator?.display_name || listing.creator?.username || "Unknown";
}

/** True when the phone number and address may be shown to the viewer. */
export function contactIsVisible(
  listing: Pick<ListingRow, "verification_status" | "user_id">,
  viewerId?: string,
  viewerRole?: string
): boolean {
  if (viewerRole === "admin") return true;
  if (viewerId && viewerId === listing.user_id) return true;
  return listing.verification_status === "approved";
}
