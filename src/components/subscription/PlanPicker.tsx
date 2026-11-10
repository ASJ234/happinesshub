import { formatUgx, type SubscriptionPlan } from "@/lib/videos";

interface PlanPickerProps {
  plans: SubscriptionPlan[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function PlanPicker({ plans, selectedId, onSelect }: PlanPickerProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {plans.map((plan) => {
        const selected = plan.id === selectedId;
        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelect(plan.id)}
            aria-pressed={selected}
            className={`text-left bg-surface border rounded-xl p-4 transition-colors ${
              selected
                ? "border-primary ring-1 ring-primary/50"
                : "border-border hover:border-primary/40"
            }`}
          >
            <p className="text-lg font-bold text-primary">{formatUgx(plan.amount)}</p>
            <p className="text-sm font-medium mt-0.5">{plan.name}</p>
            <p className="text-xs text-muted mt-1">
              Access for{" "}
              {plan.duration_days === 1 ? "24 hours" : `${plan.duration_days} days`}
            </p>
          </button>
        );
      })}
    </div>
  );
}
