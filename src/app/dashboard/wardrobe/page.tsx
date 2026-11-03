import { Shirt } from "lucide-react";
import { ListingFeed } from "@/components/listings/ListingFeed";

export default function WardrobePage() {
  return (
    <ListingFeed
      icon={Shirt}
      title="Wardrobe"
      description="Merchants selling sex toys"
      category="wardrobe"
      emptyMessage="No merchants listed yet. Check back soon."
    />
  );
}
