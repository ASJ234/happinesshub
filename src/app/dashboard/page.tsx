import { getCurrentUser } from "@/lib/auth";
import { UploadWidget } from "@/components/dashboard/UploadWidget";
import { UploadTips } from "@/components/dashboard/UploadTips";
import { LiveStreams } from "@/components/dashboard/LiveStreams";
import { ShortsClips } from "@/components/dashboard/ShortsClips";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const isCreator = user?.role === "creator" || user?.role === "admin";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">
          Welcome back, {user?.name.split(" ")[0]}
        </h1>
        <p className="text-muted text-sm">
          {isCreator
            ? "Manage your content, go live, and grow your audience."
            : "Discover videos, live streams, and trending shorts."}
        </p>
      </div>

      {isCreator ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <UploadWidget />
          </div>
          <div>
            <UploadTips />
          </div>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">Explore HappinessHub</h2>
          <p className="text-muted text-sm max-w-md mx-auto">
            Browse live streams and trending shorts below. Upgrade to a Creator account to upload videos and access studio tools.
          </p>
        </div>
      )}

      <LiveStreams />
      <ShortsClips />
    </div>
  );
}
