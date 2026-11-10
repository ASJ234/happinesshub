import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser } from "./auth";
import type { User } from "./roles";
import { createClient } from "./supabase/server";

/**
 * Shared steps of the /api/listings/[id]/* routes: sign-in, loading the
 * listing, and the ownership check. Each failure is returned as a ready
 * response so a route can `if ("response" in ctx) return ctx.response`.
 */

export interface EditableListing {
  user: User;
  supabase: SupabaseClient;
  listing: { id: string; user_id: string; category: string };
}

export function jsonError(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

/** Loads a listing the signed-in user owns, or any listing for an admin. */
export async function loadEditableListing(
  id: string
): Promise<EditableListing | { response: NextResponse }> {
  const user = await getCurrentUser();
  if (!user) return { response: jsonError("Sign in required", 401) };

  const supabase = await createClient();
  const { data: listing } = await supabase
    .from("listings")
    .select("id, user_id, category")
    .eq("id", id)
    .maybeSingle();

  if (!listing) return { response: jsonError("Profile not found", 404) };

  const isOwner = listing.user_id === user.id;
  if (!isOwner && user.role !== "admin") {
    return { response: jsonError("Not allowed", 403) };
  }

  return { user, supabase, listing };
}

export async function readForm(
  request: Request
): Promise<FormData | { response: NextResponse }> {
  try {
    return await request.formData();
  } catch {
    return { response: jsonError("Invalid request body", 400) };
  }
}

/** The uploaded image, or an error message for the user. */
export function readImage(form: FormData): File | string {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return "Choose a photo";
  if (!file.type.startsWith("image/")) return "Only image files are accepted";
  return file;
}

/** Stores the image under the owner's folder and returns its path. */
export async function uploadImage(
  supabase: SupabaseClient,
  bucket: "thumbnails" | "listing-verification",
  userId: string,
  file: File
): Promise<{ path: string } | { response: NextResponse }> {
  const ext = file.name.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase() ?? "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    console.warn(`[listings] upload failed: ${error.message}`);
    return { response: jsonError(`Upload failed: ${error.message}`, 500) };
  }
  return { path };
}

export interface ProfileInput {
  display_name: string;
  phone_number: string;
  address: string;
  description: string;
}

/** Trims and checks the profile fields shared by create and update. */
export function readProfileInput(
  body: Partial<Record<keyof ProfileInput, unknown>>
): ProfileInput | string {
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const input: ProfileInput = {
    display_name: text(body.display_name),
    phone_number: text(body.phone_number),
    address: text(body.address),
    description: text(body.description),
  };

  if (!input.display_name || input.display_name.length > 120) {
    return "Give your profile a name (1-120 characters)";
  }
  if (!input.phone_number || input.phone_number.length > 40) {
    return "A phone number is required";
  }
  if (input.address.length > 300) {
    return "The address is too long (300 characters at most)";
  }
  return input;
}

export async function readJson<T>(
  request: Request
): Promise<T | { response: NextResponse }> {
  try {
    return (await request.json()) as T;
  } catch {
    return { response: jsonError("Invalid request body", 400) };
  }
}
