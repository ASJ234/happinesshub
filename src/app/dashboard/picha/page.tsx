import { ImageIcon } from "lucide-react";
import { CategoryFeed } from "@/components/dashboard/CategoryFeed";

export default function PichaPage() {
  return (
    <CategoryFeed
      icon={ImageIcon}
      title="Picha"
      description="Photo galleries and image collections"
    />
  );
}