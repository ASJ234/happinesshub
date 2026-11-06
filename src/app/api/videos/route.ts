import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCategory, validateUploadForCategory } from "@/lib/categories";
import {
  createMuxDirectUpload,
  isMuxApiConfigured,
} from "@/lib/mux";
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
 * Starts a Mux direct upload and creates the matching draft row.
 *
 * The row exists before the file is uploaded so the Mux webhook has somewhere
 * to attach the asset as soon as it is ready. Clients may not write the mux_*
 * columns directly, so this uses the service-role client after authenticating
 * the caller.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  if (user.role !== "creator" && user.role !== "admin") {
    return NextResponse.json({ error: "Creators only" }, { status: 403 });
  }

  if (!isMuxApiConfigured() || !isAdminClientConfigured()) {
    return NextResponse.json(
      {
        error:
          "Mux is not configured. Set MUX_TOKEN_ID, MUX_TOKEN_SECRET and SUPABASE_SERVICE_ROLE_KEY.",
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

  const problem = validateUploadForCategory(category, {
    width,
    height,
    durationSeconds,
  });
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

  const exempt = profile?.verification_exempted === true;
  const status = exempt ? "published" : "pending_review";

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
      mux_status: "waiting",
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

  try {
    const upload = await createMuxDirectUpload({
      origin: new URL(request.url).origin,
      videoId: video.id,
      title,
    });

    const { error: updateError } = await admin
      .from("videos")
      .update({ mux_upload_id: upload.uploadId })
      .eq("id", video.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      videoId: video.id,
      uploadId: upload.uploadId,
      uploadUrl: upload.uploadUrl,
      status: video.status,
    });
  } catch (error) {
    await admin.from("videos").delete().eq("id", video.id);
    console.warn(`[videos] Mux upload creation failed: ${String(error)}`);
    return NextResponse.json(
      { error: "Could not start the Mux upload" },
      { status: 502 }
    );
  }
}
