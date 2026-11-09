import { getCurrentUser } from "@/lib/auth";
import { UploadWidget } from "@/components/dashboard/UploadWidget";
import { UploadTips } from "@/components/dashboard/UploadTips";
import { LiveStreams } from "@/components/dashboard/LiveStreams";
import { ShortsClips } from "@/components/dashboard/ShortsClips";

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
          <h2 className="text-lg font-semibold mb-2">Explore HAPPYPORN.COM</h2>
          <p className="text-muted text-sm max-w-md mx-auto">
            {isSignedIn
              ? "Browse live streams and the latest clips below. Upgrade to a Creator account to upload videos and access studio tools."
              : "Sign in or create a free account to watch Live Sex, Quickies, and more."}
          </p>
        </div>
      )}

      <LiveStreams />
      <ShortsClips />
    </div>
  );
}
