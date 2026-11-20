import { UtensilsCrossed } from "lucide-react";
import { CategoryFeed } from "@/components/dashboard/CategoryFeed";
import { parsePage } from "@/lib/paging";

export default async function AppetizersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = parsePage((await searchParams).page);
  return (
    <CategoryFeed
      icon={UtensilsCrossed}
      title="Appetizers"
      description="Appetizing short videos"
      category="appetizers"
      paging={{ page, basePath: "/dashboard/appetizers" }}
    />
  );
}