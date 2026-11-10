"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { getCategory } from "@/lib/categories";
import { readError } from "@/lib/fetch-error";
import { isServiceCategory, type ManagedListing } from "@/lib/listings";
import type { Role } from "@/lib/roles";
import { ListingEditor } from "./ListingEditor";
import { EMPTY_PROFILE, ProfileFields, type ProfileValues } from "./ProfileFields";
import { inputClass, primaryButtonClass } from "@/components/ui/styles";

interface ListingManagerProps {
  listings: ManagedListing[];
  role: Role;
  allowedCategories: string[];
}

const COPY: Partial<Record<Role, { title: string; hint: string }>> = {
  vendor: {
    title: "Open your Wardrobe shop",
    hint: "Buyers see your number when they tap Buy on one of your products.",
  },
  provider: {
    title: "Create your service profile",
    hint: "Choose Masseuse or Hookups. You can only have one. An admin checks your profile before it is shown.",
  },
};

const DEFAULT_COPY = {
  title: "Publish a profile",
  hint: "Masseuse and Hookups profiles are checked by an admin before they are shown.",
};

/** The signed-in user's profiles, plus the form to create the next one. */
export function ListingManager({
  listings,
  role,
  allowedCategories,
}: ListingManagerProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState(
    allowedCategories.length === 1 ? allowedCategories[0] : ""
  );
  const [values, setValues] = useState<ProfileValues>(EMPTY_PROFILE);

  const taken = new Set(listings.map((l) => l.category));
  // A service provider runs exactly one profile, Masseuse or Hookups.
  const hasService = listings.some((l) => isServiceCategory(l.category));
  const available = allowedCategories.filter(
    (slug) =>
      !taken.has(slug) &&
      !(role === "provider" && hasService && isServiceCategory(slug))
  );
  const copy = COPY[role] ?? DEFAULT_COPY;

  async function createListing() {
    setError(null);
    setMessage(null);
    setBusy(true);

    const response = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, ...values }),
    });

    setBusy(false);

    if (!response.ok) {
      setError(await readError(response, "Could not create the profile"));
      return;
    }

    const body = await response.json().catch(() => null);
    setMessage(
      body?.verification_status === "pending"
        ? "Profile created. Add your profile picture, verification photos and services below. An admin verifies it before it is shown."
        : "Published. Add your photos below."
    );
    setValues(EMPTY_PROFILE);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}

      {listings.map((listing) => (
        <ListingEditor key={listing.id} listing={listing} />
      ))}

      {available.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="font-semibold">{copy.title}</h2>
            <p className="text-xs text-muted mt-0.5">{copy.hint}</p>
          </div>

          {available.length > 1 && (
            <div>
              <label className="text-sm text-muted block mb-1.5">
                {role === "provider" ? "Service" : "Sector"}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                <option value="">
                  {role === "provider" ? "Masseuse or Hookups?" : "Choose a sector"}
                </option>
                {available.map((slug) => (
                  <option key={slug} value={slug}>
                    {getCategory(slug)?.label ?? slug}
                  </option>
                ))}
              </select>
            </div>
          )}

          <ProfileFields
            values={values}
            onChange={setValues}
            nameLabel={category === "wardrobe" ? "Shop name" : "Name"}
          />

          <button
            onClick={createListing}
            disabled={
              busy ||
              !category ||
              !values.display_name.trim() ||
              !values.phone_number.trim()
            }
            className={primaryButtonClass}
          >
            {busy ? "Creating..." : "Create"}
          </button>
        </div>
      )}
    </div>
  );
}
