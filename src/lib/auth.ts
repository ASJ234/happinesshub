import type { User } from "./roles";
import { createClient } from "./supabase/server";

const USERNAME_EMAIL_DOMAIN = "happinesshub.local";

export function usernameToEmail(username: string): string {
  return `${username}@${USERNAME_EMAIL_DOMAIN}`;
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_.]{3,20}$/.test(normalizeUsername(username));
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const metadata = user.user_metadata ?? {};
  const username = (metadata.username as string) ?? user.email?.split("@")[0] ?? "user";
  const name = (metadata.name as string) ?? username;
  const role = (metadata.role as User["role"]) ?? "viewer";

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
}