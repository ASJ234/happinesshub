import { requireRole } from "@/lib/auth";
import { MessageCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

export default async function CommentsPage() {
  await requireRole("creator", "admin");

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<MessageCircle className="text-primary" size={28} />}
        title="Comments"
        description="Comments on your videos"
      />

      <Card className="p-8 text-center text-sm text-muted">No comments yet.</Card>
    </div>
  );
}
