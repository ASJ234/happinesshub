import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Updates a listing the signed-in user owns. The verification status is never
// writable from here.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let body: {
    display_name?: string;
    phone_number?: string;
    address?: string;
    description?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, user_id, category")
    .eq("id", id)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (listing.user_id !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const displayName = (body.display_name ?? "").trim();
  const phoneNumber = (body.phone_number ?? "").trim();
  const address = (body.address ?? "").trim();
  const description = (body.description ?? "").trim();

  if (!displayName || displayName.length > 120) {
    return NextResponse.json(
      { error: "Give your profile a name (1-120 characters)" },
      { status: 400 }
    );
  }

  if (!phoneNumber || phoneNumber.length > 40) {
    return NextResponse.json(
      { error: "A phone number is required" },
      { status: 400 }
    );
  }

  if (listing.category !== "picha" && !address) {
    return NextResponse.json(
      { error: "An address is required for this sector" },
      { status: 400 }
    );
  }

  const { error: listingError } = await supabase
    .from("listings")
    .update({
      display_name: displayName,
      description: description || null,
    })
    .eq("id", id);

  if (listingError) {
    console.warn(`[listings] update failed: ${listingError.message}`);
    return NextResponse.json(
      { error: "Could not update the profile" },
      { status: 500 }
    );
  }

  const { error: contactError } = await supabase
    .from("listing_contacts")
    .update({ phone_number: phoneNumber, address: address || null })
    .eq("listing_id", id);

  if (contactError) {
    console.warn(`[listings] contact update failed: ${contactError.message}`);
    return NextResponse.json(
      { error: "Could not update the contact details" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
