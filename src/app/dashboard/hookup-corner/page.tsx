import { Sparkles } from "lucide-react";
import { CategoryFeed } from "@/components/dashboard/CategoryFeed";

export default function HookupCornerPage() {
  return (
    <CategoryFeed
      icon={Sparkles}
      title="Hookup Corner"
      description="Casual encounters and hookup content"
    />
  );
}
