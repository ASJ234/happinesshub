import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { VideoGrid } from "./VideoGrid";
import type { Paging } from "@/lib/paging";

interface CategoryFeedProps {
  icon: LucideIcon;
  title: string;
  description: string;
  category: string;
  paging: Paging;
}

export async function CategoryFeed({
  icon: Icon,
  title,
  description,
  category,
  paging,
}: CategoryFeedProps) {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Icon className="text-primary" size={28} />}
        title={title}
        description={description}
      />
      <VideoGrid category={category} paging={paging} />
    </div>
  );
}
