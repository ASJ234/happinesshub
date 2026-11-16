import type { SupabaseClient } from "@supabase/supabase-js";

export const PICHA_PAGE_SIZE = 30;
export const PICHA_BUCKET = "thumbnails";

export interface PichaPhoto {
  id: string;
  userId: string;
  url: string;
  thumbUrl: string;
  width: number | null;
  height: number | null;
  createdAt: string;
  uploader: string;
}

interface PichaRow {
  id: string;
  user_id: string;
  path: string;
  thumb_path: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
  uploader: { username: string; display_name: string | null } | null;
}

function publicUrl(supabase: SupabaseClient, path: string): string {
  return supabase.storage.from(PICHA_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Newest photos first; `before` is the createdAt of the last photo shown. */
export async function fetchPichaPhotos(
  supabase: SupabaseClient,
  options: { before?: string | null; limit?: number } = {}
): Promise<PichaPhoto[]> {
  let query = supabase
    .from("picha_photos")
    .select(
      "id, user_id, path, thumb_path, width, height, created_at, uploader:user_id(username, display_name)"
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(options.limit ?? PICHA_PAGE_SIZE);
  if (options.before) query = query.lt("created_at", options.before);

  const { data, error } = await query;
  if (error) {
    console.warn(`[picha] fetch failed: ${error.message}`);
    return [];
  }

  return ((data ?? []) as unknown as PichaRow[]).map((row) => {
    const uploader = Array.isArray(row.uploader) ? row.uploader[0] : row.uploader;
    return {
      id: row.id,
      userId: row.user_id,
      url: publicUrl(supabase, row.path),
      thumbUrl: publicUrl(supabase, row.thumb_path ?? row.path),
      width: row.width,
      height: row.height,
      createdAt: row.created_at,
      uploader: uploader?.display_name || uploader?.username || "Unknown",
    };
  });
}

/** Who may post to Picha. */
export function canPostPicha(role: string): boolean {
  return role === "creator" || role === "admin";
}
