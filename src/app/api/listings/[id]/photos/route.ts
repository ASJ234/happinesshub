import { NextResponse } from "next/server";
import {
  jsonError,
  loadEditableListing,
  readForm,
  readImage,
  uploadImage,
} from "@/lib/listing-routes";

const PHOTO_KINDS = [
  "avatar",
  "body",
  "face",
  "gallery",
  "product",
  "other",
] as const;
type PhotoKind = (typeof PHOTO_KINDS)[number];

const PRIVATE_KINDS: PhotoKind[] = ["body", "face"];

type Params = { params: Promise<{ id: string }> };

// Uploads a photo for a listing. Body and face photos go into the private
// verification bucket; the profile picture, gallery and product photos go into
// the public bucket. A new profile picture replaces the previous one.
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;

  const ctx = await loadEditableListing(id);
  if ("response" in ctx) return ctx.response;
  const { user, supabase } = ctx;

  const form = await readForm(request);
  if ("response" in form) return form.response;

  const file = readImage(form);
  if (typeof file === "string") return jsonError(file, 400);

  const rawKind = String(form.get("kind") ?? "gallery");
  const kind = (PHOTO_KINDS as readonly string[]).includes(rawKind)
    ? (rawKind as PhotoKind)
    : "gallery";
  const bucket = PRIVATE_KINDS.includes(kind)
    ? "listing-verification"
    : "thumbnails";

  const upload = await uploadImage(supabase, bucket, user.id, file);
  if ("response" in upload) return upload.response;
  const { path } = upload;

  const { error: insertError } = await supabase
    .from("listing_photos")
    .insert({ listing_id: id, path, kind, bucket });

  if (insertError) {
    await supabase.storage.from(bucket).remove([path]);
    console.warn(`[listings] photo insert failed: ${insertError.message}`);
    return jsonError("Could not attach the photo", 500);
  }

  if (kind === "avatar") {
    const { data: previous } = await supabase
      .from("listing_photos")
      .select("id, path")
      .eq("listing_id", id)
      .eq("kind", "avatar")
      .neq("path", path);

    if (previous && previous.length > 0) {
      await supabase
        .from("listing_photos")
        .delete()
        .in("id", previous.map((photo) => photo.id));
      await supabase.storage
        .from("thumbnails")
        .remove(previous.map((photo) => photo.path));
    }
  }

  return NextResponse.json({ success: true, path, kind, bucket });
}

// Removes a photo from a listing and deletes the underlying file.
export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;

  const photoId = new URL(request.url).searchParams.get("id");
  if (!photoId) return jsonError("Missing photo id", 400);

  const ctx = await loadEditableListing(id);
  if ("response" in ctx) return ctx.response;
  const { supabase } = ctx;

  const { data: photo } = await supabase
    .from("listing_photos")
    .select("id, path, bucket")
    .eq("id", photoId)
    .eq("listing_id", id)
    .maybeSingle();

  if (!photo) return jsonError("Photo not found", 404);

  const { error: deleteError } = await supabase
    .from("listing_photos")
    .delete()
    .eq("id", photoId);

  if (deleteError) {
    console.warn(`[listings] photo delete failed: ${deleteError.message}`);
    return jsonError("Could not remove the photo", 500);
  }

  await supabase.storage.from(photo.bucket).remove([photo.path]);

  return NextResponse.json({ success: true });
}
