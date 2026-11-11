import { requireRole } from "@/lib/auth";
import { Zap } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ShortsClips } from "@/components/dashboard/ShortsClips";
import { UploadWidget } from "@/components/dashboard/UploadWidget";
import { getCategory } from "@/lib/categories";

const SHORTS_CATEGORY = "quickies";

export default async function ShortsStudioPage() {
  await requireRole("creator", "admin");

  // Quickies' own limit, so the copy here can never drift from what is enforced.
  const maxSeconds = getCategory(SHORTS_CATEGORY)?.maxSeconds ?? 120;

  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Zap className="text-primary" size={28} />}
        title="Shorts Studio"
        description="Upload short-form videos"
        actions={
          <a
            href="#upload-short"
            className="bg-primary hover:bg-primary-hover text-white font-medium px-6 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Create Short
          </a>
        }
      />

      <div id="upload-short" className="scroll-mt-24">
        <UploadWidget
          lockedCategory={SHORTS_CATEGORY}
          heading="Upload a Short"
          subheading={`Videos up to ${maxSeconds} seconds — MP4, MOV, WebM. Drag and drop or click to upload.`}
        />
      </div>

      <ShortsClips />
    </div>
  );
}
