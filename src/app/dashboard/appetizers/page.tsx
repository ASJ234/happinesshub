import { UtensilsCrossed } from "lucide-react";
import { CategoryFeed } from "@/components/dashboard/CategoryFeed";

export default function AppetizersPage() {
  return (
    <CategoryFeed
      icon={UtensilsCrossed}
      title="Appetizers"
      description="Appetizing vertical videos (9:16)"
      category="appetizers"
    />
  );
}