import { MessageCircle } from "lucide-react";

const comments = [
  { user: "Sarah M.", text: "Great tutorial! Really helped me understand the concepts.", video: "Getting Started with Next.js 16", time: "2h ago" },
  { user: "Mike T.", text: "Can you do a follow-up on authentication?", video: "Dark Mode UI Design Tips", time: "5h ago" },
  { user: "Emma L.", text: "Love the dark mode design in this one 🔥", video: "Dark Mode UI Design Tips", time: "1d ago" },
];

export default function CommentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageCircle className="text-primary" size={28} />
        <div>
          <h1 className="text-2xl font-bold">Comments</h1>
          <p className="text-muted text-sm">Manage and respond to viewer comments</p>
        </div>
      </div>

      <div className="space-y-3">
        {comments.map((comment) => (
          <div key={comment.text} className="bg-surface border border-border rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold">
                  {comment.user.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <p className="text-sm font-medium">{comment.user}</p>
                  <p className="text-[11px] text-muted">on {comment.video}</p>
                </div>
              </div>
              <span className="text-[11px] text-muted">{comment.time}</span>
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
