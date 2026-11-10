import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { ReviewButtons } from "@/components/admin/ReviewButtons";
import { ListingEditor } from "@/components/listings/ListingEditor";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireRole } from "@/lib/auth";
import { getCategory } from "@/lib/categories";
import { fetchListing, listingOwnerLabel, toManagedListing } from "@/lib/listings";
import { createClient } from "@/lib/supabase/server";

const BACK_HREF = "/dashboard/admin/listings";

// An admin manages any profile or shop here with the same editor the owner
// uses, plus the review actions.
export default async function AdminListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("admin");
  const { id } = await params;
  const supabase = await createClient();

  const listing = await fetchListing(supabase, id);
  if (!listing) notFound();

  const managed = await toManagedListing(supabase, listing);
  const sector = getCategory(listing.category)?.label ?? listing.category;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href={BACK_HREF}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft size={16} />
        Profiles and shops
      </Link>

      <PageHeader
        icon={<ShieldCheck className="text-primary" size={28} />}
        title={listing.display_name}
        description={`${sector} · owned by ${listingOwnerLabel(listing)}`}
      />

      <Card className="p-4 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted">Review</p>
        <ReviewButtons listingId={listing.id} status={listing.verification_status} />
      </Card>

      <ListingEditor listing={managed} afterDeleteHref={BACK_HREF} />
    </div>
  );
}
