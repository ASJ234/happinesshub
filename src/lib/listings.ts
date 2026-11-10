import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "./roles";

export type VerificationStatus = "pending" | "approved" | "rejected";

export type ListingPhotoKind =
  | "avatar"
  | "body"
  | "face"
  | "gallery"
  | "product"
  | "other";

export interface ListingPhoto {
  id: string;
  listing_id: string;
  path: string;
  kind: ListingPhotoKind;
  bucket: "thumbnails" | "listing-verification";
}

/** A service (Masseuse, Hookups) or a product (Wardrobe). */
export interface ListingItem {
  id: string;
  listing_id: string;
  title: string | null;
  description: string | null;
  price_ugx: number | null;
  photo_path: string;
  created_at: string;
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
  /** Hidden by RLS until the listing is approved, unless you own it. */
  items: ListingItem[];
  creator: { username: string; display_name: string | null } | null;
}

const LISTING_SELECT =
  "*, contact:listing_contacts(phone_number, address), photos:listing_photos(id, listing_id, path, kind, bucket), items:listing_items(id, listing_id, title, description, price_ugx, photo_path, created_at), creator:user_id(username, display_name)";

/** Sectors run by service providers, who pick exactly one of them. */
export const SERVICE_CATEGORIES = ["masseuse", "hookups"] as const;

export function isServiceCategory(slug: string): boolean {
  return (SERVICE_CATEGORIES as readonly string[]).includes(slug);
}

/** The listing sectors an account type may publish in. */
export function listingCategoriesForRole(role: Role): string[] {
  switch (role) {
    case "admin":
      return ["picha", "wardrobe", "masseuse", "hookups"];
    case "creator":
      return ["picha"];
    case "provider":
      return [...SERVICE_CATEGORIES];
    case "vendor":
      return ["wardrobe"];
    default:
      return [];
  }
}

/** A listing as its owner edits it on /dashboard/my-listing. */
export interface ManagedListing
  extends Pick<
    ListingRow,
    | "id"
    | "category"
    | "display_name"
    | "description"
    | "verification_status"
    | "review_note"
    | "contact"
    | "photos"
  > {
  items: (ListingItem & { photoUrl: string })[];
  /** Public and signed URLs, keyed by photo path. */
  photoUrls: Record<string, string>;
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
    .select(LISTING_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (category) query = query.eq("category", category);
  if (userId) query = query.eq("user_id", userId);

  const { data, error } = await query;

  if (error) {
    console.warn(`[listings] fetch failed: ${error.message}`);
    return [];
  }

  return ((data ?? []) as ListingRow[]).map(normalizeListing);
}

export async function fetchListing(
  supabase: SupabaseClient,
  id: string
): Promise<ListingRow | null> {
  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.warn(`[listings] fetch failed: ${error.message}`);
    return null;
  }

  return data ? normalizeListing(data as ListingRow) : null;
}

function normalizeListing(listing: ListingRow): ListingRow {
  return {
    ...listing,
    photos: listing.photos ?? [],
    items: [...(listing.items ?? [])].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    ),
  };
}

export function publicPhotoUrl(supabase: SupabaseClient, path: string): string {
  return supabase.storage.from("thumbnails").getPublicUrl(path).data.publicUrl;
}

/** The newest profile picture, if one was uploaded. */
export function listingAvatarUrl(
  supabase: SupabaseClient,
  listing: Pick<ListingRow, "photos">
): string | null {
  const avatar = listing.photos.find(
    (photo) => photo.kind === "avatar" && photo.bucket === "thumbnails"
  );
  return avatar ? publicPhotoUrl(supabase, avatar.path) : null;
}

/**
 * Public gallery / product photos, safe to render in an <img src>. The profile
 * picture is left out, see listingAvatarUrl.
 */
export function listingPhotoUrls(
  supabase: SupabaseClient,
  listing: ListingRow
): string[] {
  return listing.photos
    .filter((photo) => photo.bucket === "thumbnails" && photo.kind !== "avatar")
    .map((photo) => publicPhotoUrl(supabase, photo.path));
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

export interface WardrobeProduct extends ListingItem {
  listing: {
    id: string;
    display_name: string;
    contact: { phone_number: string } | null;
  };
}

/** Every Wardrobe product, newest first, with its shop and number. */
export async function fetchWardrobeProducts(
  supabase: SupabaseClient,
  limit = 120
): Promise<WardrobeProduct[]> {
  const { data, error } = await supabase
    .from("listing_items")
    .select(
      "id, listing_id, title, description, price_ugx, photo_path, created_at, listing:listings!inner(id, display_name, category, contact:listing_contacts(phone_number))"
    )
    .eq("listing.category", "wardrobe")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.warn(`[listings] products fetch failed: ${error.message}`);
    return [];
  }

  return (data ?? []) as unknown as WardrobeProduct[];
}

/** Builds the editable form of a listing, with every photo URL resolved. */
export async function toManagedListing(
  supabase: SupabaseClient,
  listing: ListingRow
): Promise<ManagedListing> {
  const publicUrls = Object.fromEntries(
    listing.photos
      .filter((photo) => photo.bucket === "thumbnails")
      .map((photo) => [photo.path, publicPhotoUrl(supabase, photo.path)])
  );

  return {
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
      ...publicUrls,
      ...(await signedVerificationUrls(supabase, listing.photos)),
    },
  };
}
