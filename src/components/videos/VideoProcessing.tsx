import { Spinner } from "@/components/ui/Spinner";

interface VideoProcessingProps {
  /** Bunny's encoding progress, 0-100, when known. */
  progress: number | null;
}

/** Shown in place of the player while Bunny prepares a fresh upload. */
export function VideoProcessing({ progress }: VideoProcessingProps) {
  const known = progress !== null && progress > 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full h-64 bg-black rounded-xl border border-border flex flex-col items-center justify-center gap-3 px-6 text-center"
    >
      <Spinner size={26} className="text-primary" />
      <div>
        <p className="text-sm font-medium text-foreground">
          Preparing this video{known ? ` · ${Math.round(progress)}%` : "…"}
        </p>
        <p className="text-xs text-muted mt-1">
          New uploads usually take 1–3 minutes. It will start here by itself.
        </p>
      </div>
      {known && (
        <div className="w-48 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
          <div
            className="h-full gradient-brand transition-[width] duration-700"
            style={{ width: `${Math.min(100, Math.max(4, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}
