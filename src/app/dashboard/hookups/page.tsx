import { Sparkles } from "lucide-react";
import { ListingFeed } from "@/components/listings/ListingFeed";

export default function HookupsPage() {
  return (
    <ListingFeed
      icon={Sparkles}
      title="Hookups"
      description="Companions available to book"
      category="hookups"
      emptyMessage="No profiles listed yet. Check back soon."
    />
  );
}
