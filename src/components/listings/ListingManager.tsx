"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  ImagePlus,
  Phone,
  Trash2,
} from "lucide-react";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import { LISTING_CATEGORIES } from "@/lib/categories";
import type { ListingPhoto, VerificationStatus } from "@/lib/listings";

export interface ManagedListing {
  id: string;
  category: string;
  display_name: string;
  description: string | null;
  verification_status: VerificationStatus;
  review_note: string | null;
  contact: { phone_number: string; address: string | null } | null;
  photos: ListingPhoto[];
  photoUrls: Record<string, string>;
}

interface ListingManagerProps {
  listings: ManagedListing[];
}

const inputClass =
  "w-full bg-surface-elevated border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";

function categoryLabel(slug: string): string {
  return (
    LISTING_CATEGORIES.find((c) => c.slug === slug)?.label ?? slug
  );
}

export function ListingManager({ listings }: ListingManagerProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [newCategory, setNewCategory] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const taken = new Set(listings.map((l) => l.category));
  const available = LISTING_CATEGORIES.filter((c) => !taken.has(c.slug));

  async function createListing() {
    setError(null);
    setMessage(null);
    setBusy(true);

    const response = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: newCategory,
        display_name: newName,
        phone_number: newPhone,
        address: newAddress,
        description: newDescription,
      }),
    });

    const body = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setError(body?.error ?? "Could not create the profile");
      return;
    }

    setMessage(
      body.verification_status === "pending"
        ? "Profile created. An admin has to verify it before the contact details are shown."
        : "Profile created and published."
    );
    setNewCategory("");
    setNewName("");
    setNewPhone("");
    setNewAddress("");
    setNewDescription("");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2.5">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="flex items-start gap-2 text-sm text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2.5">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          <span>{message}</span>
        </div>
      )}

      {listings.map((listing) => (
        <ListingEditor key={listing.id} listing={listing} />
      ))}

      {available.length > 0 && (
        <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
          <div>
            <h2 className="font-semibold">Publish a profile</h2>
            <p className="text-xs text-muted mt-0.5">
              Masseuse and Hookups profiles are checked by an admin before the
              contact details are shown.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-muted block mb-1.5">Sector</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className={inputClass}
              >
                <option value="">Choose a sector</option>
                {available.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted block mb-1.5">Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={120}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-sm text-muted block mb-1.5">Phone number</label>
              <input
                type="text"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                maxLength={40}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-sm text-muted block mb-1.5">
                Address{" "}
                {newCategory === "picha" ? (
                  <span className="text-xs">(optional)</span>
                ) : null}
              </label>
              <input
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                maxLength={300}
                className={inputClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm text-muted block mb-1.5">
                Description <span className="text-xs">(optional)</span>
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
                className={`${inputClass} resize-y`}
              />
            </div>
          </div>

          <button
            onClick={createListing}
            disabled={busy || !newCategory || !newName.trim() || !newPhone.trim()}
            className="bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            {busy ? "Publishing..." : "Publish profile"}
          </button>
        </div>
      )}
    </div>
  );
}

interface ListingEditorProps {
  listing: ManagedListing;
}

function ListingEditor({ listing }: ListingEditorProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const kindRef = useRef<string>("gallery");

  const [displayName, setDisplayName] = useState(listing.display_name);
  const [description, setDescription] = useState(listing.description ?? "");
  const [phone, setPhone] = useState(listing.contact?.phone_number ?? "");
  const [address, setAddress] = useState(listing.contact?.address ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const needsVerification =
    listing.category === "masseuse" || listing.category === "hookups";
  const hasBody = listing.photos.some((p) => p.kind === "body");
  const hasFace = listing.photos.some((p) => p.kind === "face");

  async function save() {
    setBusy(true);
    setError(null);
    setNote(null);

    const response = await fetch(`/api/listings/${listing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: displayName,
        phone_number: phone,
        address,
        description,
      }),
    });

    const body = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setError(body?.error ?? "Could not save the profile");
      return;
    }

    setNote("Profile saved");
    router.refresh();
  }

  async function uploadPhoto(file: File, kind: string) {
    setBusy(true);
    setError(null);
    setNote(null);

    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);

    const response = await fetch(`/api/listings/${listing.id}/photos`, {
      method: "POST",
      body: form,
    });

    const body = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setError(body?.error ?? "Could not upload the photo");
      return;
    }

    setNote("Photo uploaded");
    router.refresh();
  }

  async function removePhoto(photoId: string) {
    setBusy(true);
    const response = await fetch(
      `/api/listings/${listing.id}/photos?id=${photoId}`,
      { method: "DELETE" }
    );
    const body = await response.json().catch(() => null);
    setBusy(false);

    if (!response.ok) {
      setError(body?.error ?? "Could not remove the photo");
      return;
    }

    setNote("Photo removed");
    router.refresh();
  }

  const photoKinds = needsVerification
    ? ([
        { kind: "body", label: "Full body photo" },
        { kind: "face", label: "Face photo" },
        { kind: "gallery", label: "Gallery photo" },
      ] as const)
    : listing.category === "wardrobe"
      ? ([
          { kind: "product", label: "Product photo" },
          { kind: "gallery", label: "Gallery photo" },
        ] as const)
      : ([{ kind: "gallery", label: "Picture" }] as const);

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold">{categoryLabel(listing.category)}</h2>
          <p className="text-xs text-muted mt-0.5">
            {needsVerification
              ? "Upload a full-body photo and a face photo. An admin then approves or rejects your profile."
              : "This sector is published as soon as you save it."}
          </p>
        </div>
        <VerifiedBadge status={listing.verification_status} />
      </div>

      {listing.review_note && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          Admin note: {listing.review_note}
        </p>
      )}

      {needsVerification && listing.verification_status !== "approved" && (
        <p className="text-xs text-muted">
          Full-body photo {hasBody ? "✓" : "✗"} · Face photo {hasFace ? "✓" : "✗"}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-sm text-muted block mb-1.5">Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={120}
            className={inputClass}
          />
        </div>
        <div>
          <label className="text-sm text-muted block mb-1.5">Phone number</label>
          <div className="relative">
            <Phone
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={40}
              className={`${inputClass} pl-8`}
            />
          </div>
        </div>
        <div>
          <label className="text-sm text-muted block mb-1.5">
            Address{" "}
            {listing.category === "picha" ? (
              <span className="text-xs">(optional)</span>
            ) : null}
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            maxLength={300}
            className={inputClass}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-sm text-muted block mb-1.5">
            Description <span className="text-xs">(optional)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className={`${inputClass} resize-y`}
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-muted block mb-2">Photos</label>
        <div className="flex flex-wrap gap-3">
          {listing.photos.map((photo) => {
            const url = listing.photoUrls[photo.path];
            return (
              <div
                key={photo.id}
                className="relative w-24 h-24 rounded-lg overflow-hidden border border-border bg-surface-elevated"
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={photo.kind}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-[10px] text-muted px-1 text-center">
                    {photo.kind}
                  </span>
                )}
                <button
                  onClick={() => removePhoto(photo.id)}
                  disabled={busy}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-red-400 flex items-center justify-center disabled:opacity-50"
                  title="Remove photo"
                >
                  <Trash2 size={12} />
                </button>
                <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[10px] text-white text-center py-0.5">
                  {photo.kind}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {photoKinds.map((option) => (
            <button
              key={option.kind}
              onClick={() => {
                kindRef.current = option.kind;
                fileRef.current?.click();
              }}
              disabled={busy}
              className="inline-flex items-center gap-1.5 text-xs bg-surface-elevated hover:bg-primary/15 border border-border rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
            >
              <ImagePlus size={13} />
              {option.label}
            </button>
          ))}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadPhoto(file, kindRef.current);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {note && <p className="text-xs text-green-400">{note}</p>}

      <button
        onClick={save}
        disabled={busy}
        className="bg-primary hover:bg-primary-hover text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
      >
        {busy ? "Saving..." : "Save profile"}
      </button>
    </div>
  );
}
