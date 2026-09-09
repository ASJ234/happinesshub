import { UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { UploadWidget } from "@/components/dashboard/UploadWidget";
import { UploadTips } from "@/components/dashboard/UploadTips";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<UploadCloud className="text-primary" size={28} />}
        title="Upload Video"
        description="Share your content with the HappinessHub community"
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UploadWidget />
        </div>
        <UploadTips />
      </div>
    </div>
  );
}
