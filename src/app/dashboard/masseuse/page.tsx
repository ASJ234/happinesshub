import { Hand } from "lucide-react";
import { ListingFeed } from "@/components/listings/ListingFeed";

export default function MasseusePage() {
  return (
    <ListingFeed
      icon={Hand}
      title="Masseuse"
      description="Massage ladies available to hire"
      category="masseuse"
      emptyMessage="No masseuses listed yet. Check back soon."
    />
  );
}
