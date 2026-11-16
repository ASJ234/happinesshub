import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchPichaPhotos } from "@/lib/picha";
import { createClient } from "@/lib/supabase/server";

/** The next page of Picha photos, older than `before`. */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const before = new URL(request.url).searchParams.get("before");
  const supabase = await createClient();
  const photos = await fetchPichaPhotos(supabase, { before });
  return NextResponse.json({ photos });
}
