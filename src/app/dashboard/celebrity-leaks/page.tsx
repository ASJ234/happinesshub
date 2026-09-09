import { Star } from "lucide-react";
import { CategoryFeed } from "@/components/dashboard/CategoryFeed";

export default function CelebrityLeaksPage() {
  return (
    <CategoryFeed
      icon={Star}
      title="Celebrity Leaks"
      description="The latest celebrity videos and exclusive leaked content"
    />
  );
}