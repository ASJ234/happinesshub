import { Radio } from "lucide-react";
import { CategoryFeed } from "@/components/dashboard/CategoryFeed";

export default function LiveSexPage() {
  return (
    <CategoryFeed
      icon={Radio}
      title="Live Sex"
      description="Live adult streams happening right now"
    />
  );
}