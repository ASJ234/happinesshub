import { NextResponse } from "next/server";
import {
  jsonError,
  loadEditableListing,
  readJson,
  readProfileInput,
  type ProfileInput,
} from "@/lib/listing-routes";

// Updates a listing the signed-in user owns. The verification status is never
// writable from here.
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

  const { error: contactError } = await supabase
    .from("listing_contacts")
    .update({ phone_number: input.phone_number, address: input.address || null })
    .eq("listing_id", id);

  if (contactError) {
    console.warn(`[listings] contact update failed: ${contactError.message}`);
    return jsonError("Could not update the contact details", 500);
  }

  return NextResponse.json({ success: true });
}
