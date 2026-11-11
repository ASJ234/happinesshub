import type { GiftAlert } from "./useLiveGiftFeed";

interface GiftAlertsProps {
  alerts: GiftAlert[];
  className?: string;
}

/** "🌹 Amina sent a Rose" — one line per gift that just arrived. */
export function GiftAlerts({ alerts, className = "" }: GiftAlertsProps) {
  if (alerts.length === 0) return null;

  return (
    <div className={`space-y-1 ${className}`} aria-live="polite">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-black/70 text-white text-xs px-2.5 py-1 rounded flex items-center gap-1.5"
        >
          <span>{alert.emoji}</span>
          <span>
            <span className="font-medium">{alert.sender}</span> sent a {alert.giftName}
          </span>
        </div>
      ))}
    </div>
  );
}
