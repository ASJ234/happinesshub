import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const PHOTO_KINDS = ["body", "face", "gallery", "product", "other"] as const;
type PhotoKind = (typeof PHOTO_KINDS)[number];

const PRIVATE_KINDS: PhotoKind[] = ["body", "face"];

// Uploads a photo for a listing. Body and face photos go into the private
// verification bucket; gallery and product photos go into the public bucket.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const file = form.get("file");
  const rawKind = String(form.get("kind") ?? "gallery");

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Choose a photo to upload" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Only image files are accepted" },
      { status: 400 }
    );
  }

  const kind = (PHOTO_KINDS as readonly string[]).includes(rawKind)
    ? (rawKind as PhotoKind)
    : "gallery";

  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (listing.user_id !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const bucket = PRIVATE_KINDS.includes(kind)
    ? "listing-verification"
    : "thumbnails";
  const ext = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.warn(`[listings] photo upload failed: ${uploadError.message}`);
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { error: insertError } = await supabase
    .from("listing_photos")
    .insert({ listing_id: id, path, kind, bucket });

  if (insertError) {
    await supabase.storage.from(bucket).remove([path]);
    console.warn(`[listings] photo insert failed: ${insertError.message}`);
    return NextResponse.json(
      { error: "Could not attach the photo" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, path, kind, bucket });
}

// Removes a photo from a listing and deletes the underlying file.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const photoId = new URL(request.url).searchParams.get("id");
  if (!photoId) {
    return NextResponse.json({ error: "Missing photo id" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (listing.user_id !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { data: photo } = await supabase
    .from("listing_photos")
    .select("id, path, bucket")
    .eq("id", photoId)
    .eq("listing_id", id)
    .maybeSingle();

  if (!photo) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const { error: deleteError } = await supabase
    .from("listing_photos")
    .delete()
    .eq("id", photoId);

  if (deleteError) {
    console.warn(`[listings] photo delete failed: ${deleteError.message}`);
    return NextResponse.json(
      { error: "Could not remove the photo" },
      { status: 500 }
    );
  }

  await supabase.storage.from(photo.bucket).remove([photo.path]);

  return NextResponse.json({ success: true });
}
