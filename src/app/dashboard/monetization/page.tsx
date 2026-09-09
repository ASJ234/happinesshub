import { DollarSign } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

export default function MonetizationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<DollarSign className="text-primary" size={28} />}
        title="Monetization"
        description="Configure ads, sponsorships, and revenue streams"
      />

      <Card className="p-6 max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold">Ad Revenue</h3>
            <p className="text-sm text-muted">Enable ads on your videos</p>
          </div>
          <div className="w-11 h-6 bg-primary rounded-full relative shrink-0 cursor-pointer">
            <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full" />
          </div>
        </div>
        <div className="border-t border-border pt-4">
          <p className="text-sm text-muted mb-1">Estimated monthly earnings</p>
          <p className="text-3xl font-bold gradient-text">$842.50</p>
        </div>
      </Card>
    </div>
  );
}