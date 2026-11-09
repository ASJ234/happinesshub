import { CheckCircle2 } from "lucide-react";

const UPLOAD_TIPS = [
  "Use 1080p or 4K resolution for best quality",
  "Add titles, descriptions, and tags for discoverability",
  "Set visibility before publishing",
];

export function UploadTips() {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <h3 className="text-sm font-semibold mb-4">Upload Tips</h3>
      <ul className="space-y-3">
        {UPLOAD_TIPS.map((tip) => (
          <li key={tip} className="flex items-start gap-2.5 text-sm text-muted">
            <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}
