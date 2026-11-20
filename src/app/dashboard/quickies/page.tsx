import { Zap } from "lucide-react";
import { CategoryFeed } from "@/components/dashboard/CategoryFeed";
import { parsePage } from "@/lib/paging";

export default async function QuickiesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = parsePage((await searchParams).page);
  return (
    <CategoryFeed
      icon={Zap}
      title="Quickies"
      description="Short videos"
      category="quickies"
      paging={{ page, basePath: "/dashboard/quickies" }}
    />
  );
}