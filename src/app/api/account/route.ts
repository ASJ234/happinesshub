import { NextResponse } from "next/server";
import {
  getCurrentUser,
  isValidUsername,
  normalizeUsername,
  usernameToEmail,
} from "@/lib/auth";
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";

const MAX_NAME_LENGTH = 50;

// Updates the signed-in user's display name and username. The admin account's
// credentials are managed by the developer only, so admins are refused.
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  }
  if (user.role === "admin") {
    return NextResponse.json(
      { error: "Admin credentials can only be changed by the developer" },
      { status: 403 }
    );
  }

  let body: { display_name?: unknown; username?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const displayName =
    typeof body.display_name === "string" ? body.display_name.trim() : "";
  const username =
    typeof body.username === "string" ? normalizeUsername(body.username) : "";

  if (!displayName || displayName.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Display name must be 1-${MAX_NAME_LENGTH} characters` },
      { status: 400 }
    );
  }
  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: "Invalid username (3-20 characters: letters, numbers, _ . )" },
      { status: 400 }
    );
  }

  if (!rateLimit(`account:${user.id}`)) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a minute and try again." },
      { status: 429 }
    );
  }

  if (!isAdminClientConfigured()) {
    return NextResponse.json(
      { error: "Account updates are not configured on the server" },
      { status: 500 }
    );
  }

  const admin = createAdminClient();
  const usernameChanged = username !== user.username;

  if (usernameChanged) {
    const { data: taken } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", user.id)
      .maybeSingle();
    if (taken) {
      return NextResponse.json(
        { error: "That username is already taken" },
        { status: 409 }
      );
    }
  }

  const { data: authUser, error: fetchError } =
    await admin.auth.admin.getUserById(user.id);
  if (fetchError || !authUser.user) {
    return NextResponse.json({ error: "Could not load your account" }, { status: 500 });
  }

  // The username is the login identity (<username>@domain), so the auth email
  // changes with it. email_confirm skips the confirmation mail for the
  // synthetic address.
  const { error: authError } = await admin.auth.admin.updateUserById(user.id, {
    ...(usernameChanged && {
      email: usernameToEmail(username),
      email_confirm: true,
    }),
    user_metadata: {
      ...authUser.user.user_metadata,
      username,
      display_name: displayName,
    },
  });
  if (authError) {
    console.warn(`[account] auth update failed: ${authError.message}`);
    return NextResponse.json(
      {
        error: usernameChanged
          ? "That username is already taken"
          : "Could not update your account",
      },
      { status: 400 }
    );
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ username, display_name: displayName })
    .eq("id", user.id);
  if (profileError) {
    console.warn(`[account] profile update failed: ${profileError.message}`);
    return NextResponse.json(
      { error: "Saved your login, but could not update your profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
