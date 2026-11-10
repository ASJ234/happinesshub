import { Sparkles } from "lucide-react";
import { ProviderFeed } from "@/components/listings/ProviderFeed";

export default function HookupsPage() {
  return (
    <ProviderFeed
      icon={Sparkles}
      title="Hookups"
      description="Companions available to book. Tap a profile to see photos and services."
      category="hookups"
      emptyMessage="No profiles listed yet. Check back soon."
    />
  );
}
