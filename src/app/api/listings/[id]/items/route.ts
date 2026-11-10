import { NextResponse } from "next/server";
import { isServiceCategory } from "@/lib/listings";
import {
  jsonError,
  loadEditableListing,
  readForm,
  readImage,
  uploadImage,
} from "@/lib/listing-routes";

const MAX_PRICE_UGX = 1_000_000_000;

type Params = { params: Promise<{ id: string }> };

/** The validated price for a product, or an error message. */
function readPrice(raw: string): number | string {
  const digits = raw.replace(/[,\s]/g, "");
  if (!/^\d+$/.test(digits)) return "A price in UGX is required, in whole shillings";
  const price = Number(digits);
  if (price <= 0 || price > MAX_PRICE_UGX) return "Enter a price above zero";
  return price;
}

// Adds a service (Masseuse, Hookups: photo + description) or a product
// (Wardrobe: photo + name + price) to a listing. Owners and admins only.
// The photo goes into the public 'thumbnails' bucket.
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  const ctx = await loadEditableListing(id);
  if ("response" in ctx) return ctx.response;
  const { user, supabase, listing } = ctx;

  const form = await readForm(request);
  if ("response" in form) return form.response;

  const file = readImage(form);
  if (typeof file === "string") return jsonError(file, 400);

  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();

  if (title.length > 120) {
    return jsonError("The name is too long (120 characters at most)", 400);
  }
  if (description.length > 2000) {
    return jsonError("The description is too long (2000 characters at most)", 400);
  }

  let price: number | null = null;

  if (listing.category === "wardrobe") {
    if (!title) return jsonError("Give the product a name", 400);
    const parsed = readPrice(String(form.get("price") ?? ""));
    if (typeof parsed === "string") return jsonError(parsed, 400);
    price = parsed;
  } else if (isServiceCategory(listing.category)) {
    if (!description) return jsonError("Describe the service", 400);
  } else {
    return jsonError("This sector does not take services or products", 400);
  }

  const upload = await uploadImage(supabase, "thumbnails", user.id, file);
  if ("response" in upload) return upload.response;

  const { error: insertError } = await supabase.from("listing_items").insert({
    listing_id: id,
    title: title || null,
    description: description || null,
    price_ugx: price,
    photo_path: upload.path,
  });

  if (insertError) {
    await supabase.storage.from("thumbnails").remove([upload.path]);
    console.warn(`[listings] item insert failed: ${insertError.message}`);
    return jsonError("Could not save it. Try again.", 500);
  }

  return NextResponse.json({ success: true });
}

// Removes a service or product and deletes its photo.
export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;

  const itemId = new URL(request.url).searchParams.get("id");
  if (!itemId) return jsonError("Missing item id", 400);

  const ctx = await loadEditableListing(id);
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { data: item } = await supabase
    .from("listing_items")
    .select("id, photo_path")
    .eq("id", itemId)
    .eq("listing_id", id)
    .maybeSingle();

  if (!item) return jsonError("Not found", 404);

  const { error: deleteError } = await supabase
    .from("listing_items")
    .delete()
    .eq("id", itemId);

  if (deleteError) {
    console.warn(`[listings] item delete failed: ${deleteError.message}`);
    return jsonError("Could not remove it", 500);
  }

  await supabase.storage.from("thumbnails").remove([item.photo_path]);

  return NextResponse.json({ success: true });
}
