import { Compass } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { VideoGrid } from "@/components/dashboard/VideoGrid";
import { LiveStreams } from "@/components/dashboard/LiveStreams";
import { ShortsClips } from "@/components/dashboard/ShortsClips";

export default function ExplorePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Compass className="text-primary" size={28} />}
        title="Explore"
        description="Discover trending content across HappinessHub"
      />
      <section>
        <h2 className="text-lg font-semibold mb-4">Latest Videos</h2>
        <VideoGrid />
      </section>
      <LiveStreams />
      <ShortsClips />
    </div>
  );
}
