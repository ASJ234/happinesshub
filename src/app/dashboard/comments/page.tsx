import { MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { mockComments } from "@/lib/mock-data";

export default function CommentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<MessageCircle className="text-primary" size={28} />}
        title="Comments"
        description="Manage and respond to viewer comments"
      />

      <div className="space-y-3">
        {mockComments.map((comment) => (
          <div key={comment.text} className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {comment.user.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{comment.user}</p>
                  <p className="text-[11px] text-muted truncate">on {comment.video}</p>
                </div>
              </div>
              <span className="text-[11px] text-muted shrink-0">{comment.time}</span>
            </div>
            <p className="text-sm text-muted ml-10">{comment.text}</p>
            <div className="flex gap-2 mt-3 ml-10">
              <button className="text-xs text-primary hover:text-primary-hover font-medium">Reply</button>
              <button className="text-xs text-muted hover:text-foreground">Hide</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}