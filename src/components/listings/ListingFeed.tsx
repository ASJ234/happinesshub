import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ListingGrid } from "@/components/listings/ListingGrid";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchListings } from "@/lib/listings";

interface ListingFeedProps {
  icon: LucideIcon;
  title: string;
  description: string;
  category: string;
  emptyMessage?: string;
}

export async function ListingFeed({
  icon: Icon,
  title,
  description,
  category,
  emptyMessage,
}: ListingFeedProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const listings = await fetchListings(supabase, { category });

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Icon className="text-primary" size={28} />}
        title={title}
        description={description}
      />
      <ListingGrid
        listings={listings}
        supabase={supabase}
        viewerId={user.id}
        viewerRole={user.role}
        emptyMessage={emptyMessage}
      />
    </div>
  );
}
