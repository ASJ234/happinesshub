import { Radio } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { LiveStreams } from "@/components/dashboard/LiveStreams";

export default function LiveStudioPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        icon={<Radio className="text-primary" size={28} />}
        title="Live Studio"
        description="Start and manage your live broadcasts"
        actions={
          <button className="bg-red-600 hover:bg-red-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors">
            Go Live
          </button>
        }
      />

      <Card className="p-8 text-center">
        <Radio size={48} className="text-primary mx-auto mb-4" />
        <h2 className="text-lg font-semibold mb-2">Ready to broadcast?</h2>
        <p className="text-muted text-sm max-w-md mx-auto mb-6">
          Set up your stream title, thumbnail, and category before going live to your audience.
        </p>
        <button className="gradient-brand text-white font-medium px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity">
          Configure Stream
        </button>
      </Card>

      <LiveStreams />
    </div>
  );
}