import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isListingCategory } from "@/lib/categories";
import { isServiceCategory, listingCategoriesForRole } from "@/lib/listings";
import {
  jsonError,
  readJson,
  readProfileInput,
  type ProfileInput,
} from "@/lib/listing-routes";
import { createClient } from "@/lib/supabase/server";

// Creates a listing. Creators publish Picha, service providers one Masseuse or
// Hookups profile, vendors a Wardrobe shop. Masseuse and Hookups profiles
// start as pending and need an admin to approve them; the database decides the
// status (prepare_listing), so it is never taken from the request.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Sign in required", 401);

  const allowed = listingCategoriesForRole(user.role);
  if (allowed.length === 0) {
    return jsonError(
      "Switch your account to Service Provider or Vendor in Settings first",
      403
    );
  }

  const body = await readJson<Partial<ProfileInput> & { category?: unknown }>(
    request
  );
  if ("response" in body) return body.response;

  const category = typeof body.category === "string" ? body.category.trim() : "";
  if (!isListingCategory(category)) return jsonError("Unknown category", 400);
  if (!allowed.includes(category)) {
    return jsonError("Your account type cannot publish in this sector", 403);
  }

  const input = readProfileInput(body);
  if (typeof input === "string") return jsonError(input, 400);

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("listings")
    .select("category")
    .eq("user_id", user.id);
  const owned = (existing ?? []).map((row) => row.category as string);

  if (owned.includes(category)) {
    return jsonError("You already have a profile in this sector", 409);
  }
  // Admins may run both service profiles; providers get exactly one.
  if (
    user.role !== "admin" &&
    isServiceCategory(category) &&
    owned.some(isServiceCategory)
  ) {
    return jsonError(
      "A service provider can have only one Masseuse or Hookups profile",
      409
    );
  }

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .insert({
      user_id: user.id,
      category,
      display_name: input.display_name,
      description: input.description || null,
    })
    .select("id, verification_status")
    .single();

  if (listingError || !listing) {
    console.warn(`[listings] insert failed: ${listingError?.message}`);
    return jsonError("Could not create the profile", 500);
  }

  const { error: contactError } = await supabase.from("listing_contacts").insert({
    listing_id: listing.id,
    phone_number: input.phone_number,
    address: input.address || null,
  });

  if (contactError) {
    // Roll the listing back so a half-created profile never shows up.
    await supabase.from("listings").delete().eq("id", listing.id);
    console.warn(`[listings] contact insert failed: ${contactError.message}`);
    return jsonError("Could not save the contact details", 500);
  }

  return NextResponse.json({
    success: true,
    id: listing.id,
    verification_status: listing.verification_status,
  });
}
