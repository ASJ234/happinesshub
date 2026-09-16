import { Hand } from "lucide-react";
import { CategoryFeed } from "@/components/dashboard/CategoryFeed";

export default function MasseusePage() {
  return (
    <CategoryFeed
      icon={Hand}
      title="Masseuse"
      description="Massage and relaxation content"
    />
  );
}
