import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { VideoGrid } from "./VideoGrid";

interface CategoryFeedProps {
  icon: LucideIcon;
  title: string;
  description: string;
  category: string;
}

export async function CategoryFeed({
  icon: Icon,
  title,
  description,
  category,
}: CategoryFeedProps) {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Icon className="text-primary" size={28} />}
        title={title}
        description={description}
      />
      <VideoGrid category={category} />
    </div>
  );
}
