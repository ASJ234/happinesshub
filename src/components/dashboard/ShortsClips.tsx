import Link from "next/link";
import { shortsClips } from "@/lib/mock-data";

export function ShortsClips() {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">Shorts Clips</h2>
          <p className="text-sm text-muted">
            Trending Shorts — 60s clips made for quick discovery
          </p>
        </div>
        <Link
          href="/dashboard/shorts-studio"
          className="text-sm text-primary hover:text-primary-hover font-medium"
        >
          See all
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {shortsClips.map((clip) => (
          <div
            key={clip.id}
            className="bg-surface border border-border rounded-xl overflow-hidden group cursor-pointer hover:border-primary/30 transition-colors"
          >
            <div className={`relative aspect-[9/16] max-h-48 bg-gradient-to-br ${clip.thumbnail}`}>
              <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                {clip.views}
              </span>
            </div>
            <div className="p-3">
              <h3 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                {clip.title}
              </h3>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {clip.hashtags.map((tag) => (
                  <span key={tag} className="text-[10px] text-primary">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-muted mt-1">{clip.timeAgo}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
