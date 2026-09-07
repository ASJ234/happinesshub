import { UploadWidget } from "@/components/dashboard/UploadWidget";
import { UploadTips } from "@/components/dashboard/UploadTips";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Upload Video</h1>
        <p className="text-muted text-sm">Share your content with the HappinessHub community</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UploadWidget />
        </div>
        <UploadTips />
      </div>
    </div>
  );
}
