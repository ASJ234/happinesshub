import { Zap } from "lucide-react";
import { CategoryFeed } from "@/components/dashboard/CategoryFeed";

export default function QuickiesPage() {
  return (
    <CategoryFeed
      icon={Zap}
      title="Quickies"
      description="Short vertical videos (9:16)"
      category="quickies"
    />
  );
}