import { Flag } from "lucide-react";
import { CategoryFeed } from "@/components/dashboard/CategoryFeed";
import { parsePage } from "@/lib/paging";

export default async function UgandanPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = parsePage((await searchParams).page);
  return (
    <CategoryFeed
      icon={Flag}
      title="Exclusively Ugandan"
      description="Only Ugandan-made videos"
      category="ugandan"
      paging={{ page, basePath: "/dashboard/ugandan" }}
    />
  );
}
