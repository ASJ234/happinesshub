import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { VideoGrid } from "./VideoGrid";

export async function ShortsClips() {
  const user = await getCurrentUser();

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Shorts Clips</h2>
          <p className="text-sm text-muted">The latest short vertical videos</p>
        </div>
        <Link
          href="/dashboard/quickies"
          className="text-sm text-primary hover:text-primary-hover font-medium"
        >
          See all
        </Link>
      </div>

      {user ? (
        <VideoGrid
          category="quickies"
          limit={8}
          emptyMessage="No clips yet. Check back soon."
        />
      ) : (
        <Card className="p-8 text-center text-sm text-muted">
          <Link
            href="/login"
            className="text-primary hover:text-primary-hover font-medium"
          >
            Sign in
          </Link>{" "}
          to watch clips.
        </Card>
      )}
    </section>
  );
}
