import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { LiveStreams } from "./LiveStreams";
import { ShortsClips } from "./ShortsClips";

interface CategoryFeedProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function CategoryFeed({ icon: Icon, title, description }: CategoryFeedProps) {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Icon className="text-primary" size={28} />}
        title={title}
        description={description}
      />
      <LiveStreams />
      <ShortsClips />
    </div>
  );
}