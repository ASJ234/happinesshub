import { NextResponse } from "next/server";
import {
  jsonError,
  loadEditableListing,
  readJson,
  readProfileInput,
  type ProfileInput,
} from "@/lib/listing-routes";

// Updates or deletes a listing. Owners and admins only; the verification
// status is never writable from here.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ctx = await loadEditableListing(id);
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const body = await readJson<Partial<ProfileInput>>(request);
  if ("response" in body) return body.response;

  const input = readProfileInput(body);
  if (typeof input === "string") return jsonError(input, 400);
  const { error: listingError } = await supabase
    .from("listings")
    .update({
      display_name: input.display_name,
      description: input.description || null,
    })
    .eq("id", id);

  if (listingError) {
    console.warn(`[listings] update failed: ${listingError.message}`);
    return jsonError("Could not update the profile", 500);
  }

  // Upsert, so a listing that lost its contact row gets one back.
  const { error: contactError } = await supabase.from("listing_contacts").upsert({
    listing_id: id,
    phone_number: input.phone_number,
    address: input.address || null,
  });

  if (contactError) {
    console.warn(`[listings] contact update failed: ${contactError.message}`);
    return jsonError("Could not update the contact details", 500);
  }

  return NextResponse.json({ success: true });
}

// Deletes a listing with its photos, services and products. The rows cascade;
// the files are removed from storage here.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const ctx = await loadEditableListing(id);
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const [{ data: photos }, { data: items }] = await Promise.all([
    supabase.from("listing_photos").select("path, bucket").eq("listing_id", id),
    supabase.from("listing_items").select("photo_path").eq("listing_id", id),
  ]);

  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (error) {
    console.warn(`[listings] delete failed: ${error.message}`);
    return jsonError("Could not delete the profile", 500);
  }

  const publicPaths = [
    ...(photos ?? []).filter((p) => p.bucket === "thumbnails").map((p) => p.path),
    ...(items ?? []).map((item) => item.photo_path),
  ];
  const privatePaths = (photos ?? [])
    .filter((p) => p.bucket === "listing-verification")
    .map((p) => p.path);

  // Files are best-effort: the profile is already gone.
  await Promise.all([
    publicPaths.length > 0 && supabase.storage.from("thumbnails").remove(publicPaths),
    privatePaths.length > 0 &&
      supabase.storage.from("listing-verification").remove(privatePaths),
  ]);

  return NextResponse.json({ success: true });
}
