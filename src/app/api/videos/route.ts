import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCategory, validateUploadForCategory } from "@/lib/categories";
import {
  createBunnyUploadCredentials,
  createBunnyVideo,
  deleteBunnyVideo,
  isBunnyUploadConfigured,
} from "@/lib/bunny";
import {
  createAdminClient,
  isAdminClientConfigured,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

interface CreateVideoBody {
  title?: string;
  description?: string | null;
  category?: string;
  thumbnail_path?: string | null;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  aspect?: string | null;
}

function toPositiveInt(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : null;
}

/**
 * Creates the draft row and a Bunny Stream video, then returns credentials
 * that let the browser upload into that one video.
 *
 * The row exists before the file is uploaded so the Bunny webhook has somewhere
 * to report to. Clients may not write the bunny_* columns directly, so this
 * uses the service-role client after authenticating the caller.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (user.role !== "creator" && user.role !== "admin") {
    return NextResponse.json({ error: "Creators only" }, { status: 403 });
  }

  if (!isBunnyUploadConfigured() || !isAdminClientConfigured()) {
    return NextResponse.json(
      {
        error:
          "Bunny Stream is not configured. Set BUNNY_STREAM_LIBRARY_ID, BUNNY_STREAM_API_KEY and SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 503 }
    );
  }

  let body: CreateVideoBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > 200) {
    return NextResponse.json(
      { error: "Title must be between 1 and 200 characters" },
      { status: 400 }
    );
  }

  const category = typeof body.category === "string" ? body.category : "";
  const definition = getCategory(category);
  if (!definition || definition.kind !== "video") {
    return NextResponse.json({ error: "Unknown video category" }, { status: 400 });
  }

  const width = toPositiveInt(body.width);
  const height = toPositiveInt(body.height);
  const durationSeconds = toPositiveInt(body.durationSeconds);
  const aspect =
    typeof body.aspect === "string" && body.aspect.length <= 20
      ? body.aspect
      : width && height
        ? `${width}:${height}`
        : null;

  const problem = validateUploadForCategory(category, { durationSeconds });
  if (problem) {
    return NextResponse.json({ error: problem }, { status: 400 });
  }

  const thumbnailPath =
    typeof body.thumbnail_path === "string" &&
    body.thumbnail_path.startsWith(`${user.id}/`)
      ? body.thumbnail_path.slice(0, 500)
      : null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("verification_exempted")
    .eq("id", user.id)
    .maybeSingle();

  const skipsReview =
    user.role === "admin" || profile?.verification_exempted === true;
  const status = skipsReview ? "published" : "pending_review";

  const admin = createAdminClient();
  const { data: video, error: insertError } = await admin
    .from("videos")
    .insert({
      creator_id: user.id,
      title,
      description:
        typeof body.description === "string"
          ? body.description.trim().slice(0, 2000) || null
          : null,
      category,
      thumbnail_path: thumbnailPath,
      status,
      width,
      height,
      duration_seconds: durationSeconds,
      aspect,
      bunny_status: "waiting",
    })
    .select("id, status")
    .maybeSingle();

  if (insertError || !video) {
    console.warn(`[videos] insert failed: ${insertError?.message}`);
    return NextResponse.json(
      { error: "Could not save the video" },
      { status: 500 }
    );
  }

  let bunnyVideoId: string | null = null;
  try {
    bunnyVideoId = await createBunnyVideo(title);

    const { error: updateError } = await admin
      .from("videos")
      .update({ bunny_video_id: bunnyVideoId })
      .eq("id", video.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      videoId: video.id,
      upload: createBunnyUploadCredentials(bunnyVideoId),
      status: video.status,
    });
  } catch (error) {
    if (bunnyVideoId) {
      await deleteBunnyVideo(bunnyVideoId).catch(() => undefined);
    }
    await admin.from("videos").delete().eq("id", video.id);
    console.warn(`[videos] Bunny upload creation failed: ${String(error)}`);
    return NextResponse.json(
      { error: "Could not start the upload" },
      { status: 502 }
    );
  }
}
