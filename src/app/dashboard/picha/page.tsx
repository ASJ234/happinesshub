import { ImageIcon } from "lucide-react";
import { ListingFeed } from "@/components/listings/ListingFeed";

export default function PichaPage() {
  return (
    <ListingFeed
      icon={ImageIcon}
      title="Picha"
      description="Photo galleries and picture collections"
      category="picha"
      emptyMessage="No photo collections yet. Check back soon."
    />
  );
}
