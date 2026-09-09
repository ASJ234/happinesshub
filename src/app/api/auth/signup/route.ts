import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { normalizeUsername, isValidUsername, usernameToEmail } from "@/lib/auth";

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

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: usernameToEmail(username),
    password,
    options: {
      data: {
        username,
        name: username,
        role: "viewer",
      },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}