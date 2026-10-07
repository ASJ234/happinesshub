import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeUsername, isValidUsername, usernameToEmail } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const SIGNUP_ERRORS: Record<string, string> = {
  "User already registered": "That username is already taken",
  "Password should be at least 6 characters":
    "Password must be at least 6 characters",
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

  if (!rateLimit(`signup:${clientIp(request)}`)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: usernameToEmail(username),
    password,
    options: {
      // Role is never taken from client metadata: public.handle_new_user
      // always creates the profile as "viewer".
      data: {
        username,
        display_name: username,
      },
    },
  });

  if (error) {
    return NextResponse.json(
      { error: SIGNUP_ERRORS[error.message] ?? "Could not create the account." },
      { status: 400 }
    );
  }

  if (!data.session) {
    return NextResponse.json({
      success: true,
      confirmationRequired: true,
      message:
        "Account created. Check your email to confirm your address, then sign in.",
    });
  }

  return NextResponse.json({ success: true });
}
