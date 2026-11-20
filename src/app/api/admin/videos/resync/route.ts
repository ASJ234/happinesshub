import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { resyncStuckBunnyVideos } from "@/lib/bunny-sync";

// Re-checks videos whose Bunny webhook never arrived, so they can show up in
// the public listings once Bunny has finished them.
export async function POST() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Admins only" }, { status: 403 });
  }

  try {
    return NextResponse.json(await resyncStuckBunnyVideos());
  } catch (error) {
    console.warn(`[admin/videos/resync] failed: ${String(error)}`);
    return NextResponse.json(
      { error: "Could not check the videos with Bunny" },
      { status: 500 }
    );
  }
}
