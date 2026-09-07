import { CheckCircle2 } from "lucide-react";
import { uploadTips } from "@/lib/mock-data";

export function UploadTips() {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <h3 className="text-sm font-semibold mb-4">Upload Tips</h3>
      <ul className="space-y-3">
        {uploadTips.map((tip) => (
          <li key={tip} className="flex items-start gap-2.5 text-sm text-muted">
            <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}
