import { Spinner } from "@/components/ui/Spinner";

interface AuthRedirectingProps {
  title: string;
}

/** Covers the sign-in card while the dashboard loads after a successful sign-in. */
export function AuthRedirecting({ title }: AuthRedirectingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute inset-0 z-10 rounded-2xl bg-surface/95 backdrop-blur-sm flex flex-col items-center justify-center gap-4 text-center p-6 animate-[auth-fade-in_200ms_ease-out] motion-reduce:animate-none"
    >
      <div className="w-14 h-14 rounded-full gradient-brand flex items-center justify-center">
        <Spinner size={26} className="text-white" />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted mt-1">Opening your dashboard…</p>
      </div>
    </div>
  );
}
