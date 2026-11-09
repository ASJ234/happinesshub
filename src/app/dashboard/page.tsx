import { getCurrentUser } from "@/lib/auth";
import { LiveStreams } from "@/components/dashboard/LiveStreams";
import { ShortsClips } from "@/components/dashboard/ShortsClips";
import { VideoSection } from "@/components/dashboard/VideoSection";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const isCreator = user?.role === "creator" || user?.role === "admin";
  const isSignedIn = !!user;
  const firstName = user?.name.split(" ")[0] ?? "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">
          {isSignedIn ? `Welcome back, ${firstName}` : "Welcome to HAPPYPORN.COM"}
        </h1>
        <p className="text-muted text-sm">
          {isSignedIn
            ? isCreator
              ? "Manage your content, go live, and grow your audience."
              : "Discover videos, live streams, and the latest clips."
            : "Sign in to watch videos, live streams, and clips."}
        </p>
      </div>

      {!isCreator && (
        <div className="bg-surface border border-border rounded-2xl p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">Explore HAPPYPORN.COM</h2>
          <p className="text-muted text-sm max-w-md mx-auto">
            {isSignedIn
              ? "Browse videos, live streams, and the latest clips below. Upgrade to a Creator account to upload videos and access studio tools."
              : "Sign in or create a free account to watch Live Sex, Quickies, and more."}
          </p>
        </div>
      )}

      <VideoSection
        title="Explore"
        description="The latest videos across HAPPYPORN.COM"
        href="/dashboard/explore"
        excludeCategories={["ugandan", "quickies"]}
      />
      <VideoSection
        title="Exclusively Ugandan"
        description="Only Ugandan-made videos"
        href="/dashboard/ugandan"
        category="ugandan"
      />
      <LiveStreams />
      <ShortsClips />
    </div>
  );
}
