import { Hand } from "lucide-react";
import { ProviderFeed } from "@/components/listings/ProviderFeed";

export default function MasseusePage() {
  return (
    <ProviderFeed
      icon={Hand}
      title="Masseuse"
      description="Massage ladies available to hire. Tap a profile to see photos and services."
      category="masseuse"
      emptyMessage="No masseuses listed yet. Check back soon."
    />
  );
}
