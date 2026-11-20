import { Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { VideoGrid } from "@/components/dashboard/VideoGrid";
import { parsePage } from "@/lib/paging";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireUser();
  const { q, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);
  const query = (q ?? "").trim().slice(0, 100);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Search className="text-primary" size={28} />}
        title={query ? `Results for "${query}"` : "Search"}
        description={
          query
            ? "Published videos matching your query"
            : "Type something in the search bar to find videos"
        }
      />
      {query && (
        <VideoGrid
          search={query}
          paging={{
            page,
            basePath: "/dashboard/search",
            query: { q: query },
          }}
          emptyMessage={`No videos match "${query}". Try another title.`}
        />
      )}
    </div>
  );
}