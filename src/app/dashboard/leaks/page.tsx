import { Star } from "lucide-react";
import { CategoryFeed } from "@/components/dashboard/CategoryFeed";

export default function LeaksPage() {
  return (
    <CategoryFeed
      icon={Star}
      title="Leaks"
      description="The latest celebrity leaked videos"
      category="leaks"
    />
  );
}
