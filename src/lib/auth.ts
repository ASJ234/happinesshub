import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role, User } from "./roles";
import { createClient } from "./supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const USERNAME_EMAIL_DOMAIN = "happyporn.local";

export function usernameToEmail(username: string): string {
  return `${username}@${USERNAME_EMAIL_DOMAIN}`;
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_.]{3,20}$/.test(normalizeUsername(username));
}

function parseRole(value: unknown): Role {
  return value === "creator" ||
    value === "provider" ||
    value === "vendor" ||
    value === "admin" ||
    value === "viewer"
    ? value
    : "viewer";
}

/**
 * Role is read from public.profiles, never from user_metadata — metadata is
 * editable by the signed-in user and must not be trusted for authorization.
 * Missing rows or table errors fail closed to "viewer".
 */
async function getRole(
  supabase: SupabaseClient,
  userId: string
): Promise<Role> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn(
      `[auth] could not read profile role (${error.code}): ${error.message}`
    );
    return "viewer";
  }

  if (!data) {
    console.warn(
      "[auth] no profiles row for user — run supabase/migrations in order (see README)"
    );
    return "viewer";
  }

  return parseRole(data.role);
}

export const getCurrentUser = cache(async function getCurrentUser(): Promise<
  User | null
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const metadata = user.user_metadata ?? {};
  const username =
    (metadata.username as string) ?? user.email?.split("@")[0] ?? "user";
  const name =
    (metadata.display_name as string) ?? (metadata.name as string) ?? username;
  const role = await getRole(supabase, user.id);

  return {
    id: user.id,
    username,
    name,
    email: user.email ?? "",
    role,
    initials: name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
  };
});

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}
