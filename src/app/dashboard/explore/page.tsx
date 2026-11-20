import { Compass } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { VideoGrid } from "@/components/dashboard/VideoGrid";
import { LiveStreams } from "@/components/dashboard/LiveStreams";
import { ShortsClips } from "@/components/dashboard/ShortsClips";
import { parsePage } from "@/lib/paging";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = parsePage((await searchParams).page);
  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Compass className="text-primary" size={28} />}
        title="Explore"
        description="Discover trending content across HAPPYPORNUG.COM"
      />
      <section>
        <h2 className="text-lg font-semibold mb-4">Latest Videos</h2>
        <VideoGrid paging={{ page, basePath: "/dashboard/explore" }} />
      </section>
      <LiveStreams />
      <ShortsClips />
    </div>
  );
}
