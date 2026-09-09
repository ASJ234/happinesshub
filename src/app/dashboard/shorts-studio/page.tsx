import { Zap } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShortsClips } from "@/components/dashboard/ShortsClips";

export default function ShortsStudioPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Zap className="text-primary" size={28} />}
        title="Shorts Studio"
        description="Create and edit vertical short-form videos"
        actions={
          <button className="bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2.5 rounded-lg transition-colors whitespace-nowrap">
            Create Short
          </button>
        }
      />

      <div className="bg-surface border border-dashed border-primary/40 rounded-xl p-12 text-center">
        <Zap size={48} className="text-primary mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-2">Upload a Short</h2>
        <p className="text-muted text-sm max-w-md mx-auto">
          Vertical videos up to 60 seconds. Drag and drop or click to upload.
        </p>
      </div>

      <ShortsClips />
    </div>
  );
}