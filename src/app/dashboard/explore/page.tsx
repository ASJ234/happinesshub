import { Compass } from "lucide-react";
import { LiveStreams } from "@/components/dashboard/LiveStreams";
import { ShortsClips } from "@/components/dashboard/ShortsClips";

export default function ExplorePage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Compass className="text-primary" size={28} />
        <div>
          <h1 className="text-2xl font-bold">Explore</h1>
          <p className="text-muted text-sm">Discover trending content across HappinessHub</p>
        </div>
      </div>
      <LiveStreams />
      <ShortsClips />
    </div>
  );
}
