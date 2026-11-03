import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isListingCategory } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";

// Creates a listing. Masseuse and Hookups profiles start as pending and need
// an admin to approve them; Picha and Wardrobe profiles are published at once.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  if (user.role !== "creator" && user.role !== "admin") {
    return NextResponse.json(
      { error: "Only creators can publish a profile" },
      { status: 403 }
    );
  }

  let body: {
    category?: string;
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

  const category = (body.category ?? "").trim();
  const displayName = (body.display_name ?? "").trim();
  const phoneNumber = (body.phone_number ?? "").trim();
  const address = (body.address ?? "").trim();
  const description = (body.description ?? "").trim();

  if (!isListingCategory(category)) {
    return NextResponse.json({ error: "Unknown category" }, { status: 400 });
  }

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

  // Address is optional for picture collections, required elsewhere.
  if (category !== "picha" && !address) {
    return NextResponse.json(
      { error: "An address is required for this sector" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("listings")
    .select("id")
    .eq("user_id", user.id)
    .eq("category", category)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You already have a profile in this sector" },
      { status: 409 }
    );
  }

  const requiresVerification =
    category === "masseuse" || category === "hookups";

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .insert({
      user_id: user.id,
      category,
      display_name: displayName,
      description: description || null,
      verification_status: requiresVerification ? "pending" : "approved",
    })
    .select("id")
    .single();

  if (listingError || !listing) {
    console.warn(`[listings] insert failed: ${listingError?.message}`);
    return NextResponse.json(
      { error: "Could not create the profile" },
      { status: 500 }
    );
  }

  const { error: contactError } = await supabase
    .from("listing_contacts")
    .insert({
      listing_id: listing.id,
      phone_number: phoneNumber,
      address: address || null,
    });

  if (contactError) {
    // Roll the listing back so a half-created profile never shows up.
    await supabase.from("listings").delete().eq("id", listing.id);
    console.warn(`[listings] contact insert failed: ${contactError.message}`);
    return NextResponse.json(
      { error: "Could not save the contact details" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    id: listing.id,
    verification_status: requiresVerification ? "pending" : "approved",
  });
}
