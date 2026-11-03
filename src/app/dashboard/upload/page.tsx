import { requireRole } from "@/lib/auth";
import { UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { UploadWidget } from "@/components/dashboard/UploadWidget";
import { UploadTips } from "@/components/dashboard/UploadTips";

export default async function UploadPage() {
  await requireRole("creator", "admin");

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<UploadCloud className="text-primary" size={28} />}
        title="Upload Video"
        description="Share your content with the HAPPYPORN.COM community"
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
