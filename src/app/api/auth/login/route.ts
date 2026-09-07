import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import type { Role } from "@/lib/roles";

export async function POST(request: Request) {
  const body = await request.json();
  const role = body.role as Role;

  if (!["viewer", "creator", "admin"].includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const token = createSessionToken(role);
  const response = NextResponse.json({ success: true });

  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  return response;
}
