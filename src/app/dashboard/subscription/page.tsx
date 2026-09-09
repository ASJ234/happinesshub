import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";

export default function SubscriptionPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        icon={<CreditCard className="text-primary" size={28} />}
        title="Subscription"
        description="Manage your creator subscription tiers"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-1">Free Tier</h3>
          <p className="text-2xl font-bold mb-4">$0<span className="text-sm text-muted font-normal">/mo</span></p>
          <ul className="text-sm text-muted space-y-2">
            <li>• Up to 10 uploads/month</li>
            <li>• Basic analytics</li>
            <li>• Standard support</li>
          </ul>
        </div>
        <div className="bg-surface border-2 border-primary rounded-xl p-6 relative">
          <span className="absolute -top-2.5 right-4 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            CURRENT
          </span>
          <h3 className="font-semibold mb-1">Pro Creator</h3>
          <p className="text-2xl font-bold mb-4">$19<span className="text-sm text-muted font-normal">/mo</span></p>
          <ul className="text-sm text-muted space-y-2">
            <li>• Unlimited uploads</li>
            <li>• Advanced analytics</li>
            <li>• Monetization tools</li>
            <li>• Priority support</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
