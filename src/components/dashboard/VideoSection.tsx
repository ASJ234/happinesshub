import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/Card";
import { VideoGrid } from "./VideoGrid";

interface VideoSectionProps {
  title: string;
  description: string;
  href: string;
  /** Leave out to show the latest videos from every category. */
  category?: string;
  /** Categories to leave out, e.g. ones that already have their own row. */
  excludeCategories?: readonly string[];
  /** Plural noun for the prompts, e.g. "clips" or "videos". */
  itemLabel?: string;
}

/** A short row of the latest videos with a link to the full page. */
export async function VideoSection({
  title,
  description,
  href,
  category,
  excludeCategories,
  itemLabel = "videos",
}: VideoSectionProps) {
  const user = await getCurrentUser();

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted">{description}</p>
        </div>
        <Link
          href={href}
          className="text-sm text-primary hover:text-primary-hover font-medium"
        >
          See all
        </Link>
      </div>

      {user ? (
        <VideoGrid
          category={category}
          excludeCategories={excludeCategories}
          limit={8}
          emptyMessage={`No ${itemLabel} yet. Check back soon.`}
        />
      ) : (
        <Card className="p-8 text-center text-sm text-muted">
          <Link
            href="/login"
            className="text-primary hover:text-primary-hover font-medium"
          >
            Sign in
          </Link>{" "}
          to watch {itemLabel}.
        </Card>
      )}
    </section>
  );
}
