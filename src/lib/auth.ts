import { cookies } from "next/headers";
import type { Role, User } from "./roles";
import { DEMO_USERS } from "./roles";

export const SESSION_COOKIE = "happinesshub_session";

export interface Session {
  user: User;
  expiresAt: number;
}

function encodeSession(session: Session): string {
  return Buffer.from(JSON.stringify(session)).toString("base64url");
}

function decodeSession(value: string): Session | null {
  try {
    const session = JSON.parse(
      Buffer.from(value, "base64url").toString("utf-8")
    ) as Session;
    if (session.expiresAt < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  return session?.user ?? null;
}

export function createSessionToken(role: Role): string {
  const user = DEMO_USERS[role];
  const session: Session = {
    user,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  return encodeSession(session);
}

export function parseSessionToken(token: string): Session | null {
  return decodeSession(token);
}
