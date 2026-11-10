"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, ImagePlus, Trash2 } from "lucide-react";
import { VerifiedBadge } from "@/components/ui/VerifiedBadge";
import {
  chipButtonClass,
  primaryButtonClass,
  removeButtonClass,
} from "@/components/ui/styles";
import { getCategory } from "@/lib/categories";
import { readError } from "@/lib/fetch-error";
import { deleteListing } from "@/lib/listing-actions";
import { isServiceCategory, type ManagedListing } from "@/lib/listings";
import { ItemManager } from "./ItemManager";
import { ProfileAvatar } from "./ProfileAvatar";
import { ProfileFields, type ProfileValues } from "./ProfileFields";

interface ListingEditorProps {
  listing: ManagedListing;
  /** Where to go once the profile is deleted; stays on the page if unset. */
  afterDeleteHref?: string;
}

const PHOTO_KINDS = {
  service: [
    { kind: "body", label: "Full body photo (private)" },
    { kind: "face", label: "Face photo (private)" },
    { kind: "gallery", label: "Gallery photo" },
  ],
  wardrobe: [],
  picha: [{ kind: "gallery", label: "Picture" }],
} as const;

/** Edits one profile: details, profile picture, photos, services/products. */
export function ListingEditor({ listing, afterDeleteHref }: ListingEditorProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const kindRef = useRef<string>("gallery");

  const [values, setValues] = useState<ProfileValues>({
    display_name: listing.display_name,
    description: listing.description ?? "",
    phone_number: listing.contact?.phone_number ?? "",
    address: listing.contact?.address ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const service = isServiceCategory(listing.category);
  const wardrobe = listing.category === "wardrobe";
  const hasProfilePage = service || wardrobe;
  const photoKinds = service
    ? PHOTO_KINDS.service
    : wardrobe
      ? PHOTO_KINDS.wardrobe
      : PHOTO_KINDS.picha;

  const avatar = listing.photos.find((p) => p.kind === "avatar");
  const otherPhotos = listing.photos.filter((p) => p.kind !== "avatar");
  const hasBody = listing.photos.some((p) => p.kind === "body");
  const hasFace = listing.photos.some((p) => p.kind === "face");

  /** Runs a request, shows its outcome and reloads the page data. */
  async function run(request: Promise<Response>, success: string, failure: string) {
    setBusy(true);
    setError(null);
    setNote(null);
    const response = await request;
    setBusy(false);

    if (!response.ok) {
      setError(await readError(response, failure));
      return;
    }
    setNote(success);
    router.refresh();
  }

  function save() {
    run(
      fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      }),
      "Saved",
      "Could not save the profile"
    );
  }

  function uploadPhoto(file: File, kind: string) {
    const form = new FormData();
    form.append("file", file);
    form.append("kind", kind);
    run(
      fetch(`/api/listings/${listing.id}/photos`, { method: "POST", body: form }),
      kind === "avatar" ? "Profile picture updated" : "Photo uploaded",
      "Could not upload the photo"
    );
  }

  function removePhoto(photoId: string) {
    run(
      fetch(`/api/listings/${listing.id}/photos?id=${photoId}`, { method: "DELETE" }),
      "Photo removed",
      "Could not remove the photo"
    );
  }

  async function remove() {
    const label = getCategory(listing.category)?.label ?? "profile";
    if (
      !window.confirm(
        `Delete the ${label} profile "${listing.display_name}" with all its photos, services and products? This cannot be undone.`
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    const problem = await deleteListing(listing.id);
    setBusy(false);

    if (problem) return setError(problem);
    if (afterDeleteHref) router.push(afterDeleteHref);
    router.refresh();
  }

  function pickPhoto(kind: string) {
    kindRef.current = kind;
    fileRef.current?.click();
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold">{getCategory(listing.category)?.label ?? listing.category}</h2>
          <p className="text-xs text-muted mt-0.5">
            {service
              ? "Upload a full-body photo and a face photo for verification. They are only seen by admins. An admin then approves or rejects your profile."
              : wardrobe
                ? "Your shop is live. Add products below."
                : "This sector is published as soon as you save it."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <VerifiedBadge status={listing.verification_status} />
          {hasProfilePage && (
            <Link
              href={`/dashboard/profiles/${listing.id}`}
              className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-medium"
            >
              View <ExternalLink size={12} />
            </Link>
          )}
        </div>
      </div>

      {listing.review_note && (
        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
          Admin note: {listing.review_note}
        </p>
      )}

      {service && listing.verification_status !== "approved" && (
        <p className="text-xs text-muted">
          Full-body photo {hasBody ? "✓" : "✗"} · Face photo {hasFace ? "✓" : "✗"}
        </p>
      )}

      {hasProfilePage && (
        <div className="flex items-center gap-4">
          <ProfileAvatar
            src={avatar && listing.photoUrls[avatar.path]}
            alt="Profile picture"
            size="lg"
          />
          <button
            type="button"
            onClick={() => pickPhoto("avatar")}
            disabled={busy}
            className={chipButtonClass}
          >
            <ImagePlus size={13} />
            {avatar ? "Change profile picture" : "Add profile picture"}
          </button>
        </div>
      )}

      <ProfileFields
        values={values}
        onChange={setValues}
        nameLabel={wardrobe ? "Shop name" : "Name"}
      />

      {error && <p className="text-xs text-red-400">{error}</p>}
      {note && <p className="text-xs text-green-400">{note}</p>}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={save} disabled={busy} className={primaryButtonClass}>
          {busy ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
        >
          <Trash2 size={13} />
          Delete profile
        </button>
      </div>

      {photoKinds.length > 0 && (
        <div className="border-t border-border pt-5">
          <h3 className="text-sm font-medium mb-2">Photos</h3>
          <div className="flex flex-wrap gap-3">
            {otherPhotos.map((photo) => {
              const url = listing.photoUrls[photo.path];
              return (
                <div
                  key={photo.id}
                  className="relative w-24 h-24 rounded-lg overflow-hidden border border-border bg-surface-elevated"
                >
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt={photo.kind} className="w-full h-full object-cover" />
                  ) : (
                    <span className="w-full h-full flex items-center justify-center text-[10px] text-muted px-1 text-center">
                      {photo.kind}
                    </span>
                  )}
                  <button
                    onClick={() => removePhoto(photo.id)}
                    disabled={busy}
                    className={`absolute top-1 right-1 ${removeButtonClass}`}
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
                onClick={() => pickPhoto(option.kind)}
                disabled={busy}
                className={chipButtonClass}
              >
                <ImagePlus size={13} />
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}

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

      {hasProfilePage && (
        <ItemManager listingId={listing.id} items={listing.items} isShop={wardrobe} />
      )}
    </div>
  );
}
