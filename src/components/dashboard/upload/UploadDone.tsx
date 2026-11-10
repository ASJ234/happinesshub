import Link from "next/link";
import { CheckCircle2, FolderOpen } from "lucide-react";
import { primaryButtonClass } from "@/components/ui/styles";

interface UploadDoneProps {
  pendingReview: boolean;
  onUploadAnother: () => void;
}

/** Shown after a successful upload. */
export function UploadDone({ pendingReview, onUploadAnother }: UploadDoneProps) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-green-500/15 text-green-400 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 size={24} />
      </div>
      <h2 className="text-lg font-semibold mb-1">
        {pendingReview ? "Video submitted for review" : "Video uploaded"}
      </h2>
      <p className="text-sm text-muted mb-6">
        {pendingReview
          ? "An admin will review your video before it appears in the feeds. You can watch it from My Content in the meantime."
          : "Your video is processing. It will be playable as soon as encoding finishes."}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          href="/dashboard/my-content"
          className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 text-sm font-medium py-2.5 px-4 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <FolderOpen size={16} />
          My Content
        </Link>
        <button onClick={onUploadAnother} className={primaryButtonClass}>
          Upload another
        </button>
      </div>
    </div>
  );
}
