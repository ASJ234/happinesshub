import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeUsername, isValidUsername, usernameToEmail } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const AUTH_ERRORS: Record<string, string> = {
  "Invalid login credentials": "Incorrect username or password",
  "Email not confirmed": "Please confirm your email before signing in",
};

export async function POST(request: Request) {
  const body = await request.json();
  const username = normalizeUsername(body.username ?? "");
  const password = body.password ?? "";

  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: "Invalid username (3-20 characters: letters, numbers, _ . )" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 }
    );
  }

  if (!rateLimit(`login:${clientIp(request)}:${username}`)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });

  if (error) {
    console.error(`[login] supabase error for "${username}":`, error.message);
    return NextResponse.json(
      {
        error:
          AUTH_ERRORS[error.message] ??
          `Sign-in failed: ${error.message}`,
      },
      { status: 401 }
    );
  }

  return NextResponse.json({ success: true });
}
