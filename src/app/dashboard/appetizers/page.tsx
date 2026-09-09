import { UtensilsCrossed } from "lucide-react";
import { CategoryFeed } from "@/components/dashboard/CategoryFeed";

export default function AppetizersPage() {
  return (
    <CategoryFeed
      icon={UtensilsCrossed}
      title="Appetizers"
      description="Light snacks, short bites, and quick video starters"
    />
  );
}