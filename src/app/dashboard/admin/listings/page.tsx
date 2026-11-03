import { ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import {
  ListingReviewTable,
  type AdminListingRow,
} from "@/components/admin/ListingReviewTable";
import { signedVerificationUrls } from "@/lib/listings";

export default async function AdminListingsPage() {
  await requireRole("admin");

  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(
      "id, category, display_name, description, verification_status, created_at, photos:listing_photos(id, listing_id, path, kind, bucket), creator:user_id(username, display_name)"
    )
    .eq("verification_status", "pending")
    .order("created_at", { ascending: true });

  const rows = ((data ?? []) as unknown[]).map((row) => {
    const listing = row as Omit<AdminListingRow, "photoUrls" | "hasBody" | "hasFace"> & {
      creator: AdminListingRow["creator"] | AdminListingRow["creator"][];
    };
    return {
      ...listing,
      creator: Array.isArray(listing.creator)
        ? (listing.creator[0] ?? null)
        : (listing.creator ?? null),
    };
  });

  const listings: AdminListingRow[] = await Promise.all(
    rows.map(async (listing) => ({
      ...listing,
      photos: listing.photos ?? [],
      photoUrls: await signedVerificationUrls(supabase, listing.photos ?? []),
      hasBody: (listing.photos ?? []).some((p) => p.kind === "body"),
      hasFace: (listing.photos ?? []).some((p) => p.kind === "face"),
    }))
  );

  const { data: rejected } = await supabase
    .from("listings")
    .select("id")
    .eq("verification_status", "rejected");

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ShieldCheck className="text-primary" size={28} />}
        title="Profile Verification"
        description="Check the body and face photos of every Masseuse and Hookups profile"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Waiting for review"
          value={listings.length.toLocaleString()}
          icon={ShieldCheck}
        />
        <StatCard
          label="Rejected"
          value={(rejected ?? []).length.toLocaleString()}
          icon={ShieldCheck}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold">Pending profiles</h2>
          <p className="text-xs text-muted mt-0.5">
            A profile can only be approved once it has both a full-body photo
            and a face photo
          </p>
        </div>
        <ListingReviewTable listings={listings} />
      </Card>
    </div>
  );
}
