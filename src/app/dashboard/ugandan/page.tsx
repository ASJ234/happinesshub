import { Flag } from "lucide-react";
import { CategoryFeed } from "@/components/dashboard/CategoryFeed";

export default function UgandanPage() {
  return (
    <CategoryFeed
      icon={Flag}
      title="Exclusively Ugandan"
      description="Only Ugandan-made videos"
      category="ugandan"
    />
  );
}
