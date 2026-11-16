import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { PICHA_BUCKET } from "@/lib/picha";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

/** Deletes a Picha photo and its files. The owner or an admin only. */
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  // RLS lets only the owner or an admin delete the row.
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("picha_photos")
    .delete()
    .eq("id", id)
    .select("path, thumb_path");

  if (error) {
    return NextResponse.json({ error: "Could not delete the photo" }, { status: 500 });
  }
  const row = data?.[0];
  if (!row) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  // The files may belong to someone else when an admin deletes, so the
  // service role removes them.
  const paths = [row.path, row.thumb_path].filter((p): p is string => Boolean(p));
  const { error: storageError } = await createAdminClient()
    .storage.from(PICHA_BUCKET)
    .remove(paths);
  if (storageError) {
    console.warn(`[picha] could not remove files: ${storageError.message}`);
  }

  return NextResponse.json({ success: true });
}
