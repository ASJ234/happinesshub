import { Spinner } from "@/components/ui/Spinner";

interface AuthStatusMessageProps {
  title: string;
  detail: string;
}

/** The brand spinner with a title and a line of detail, for sign-in and sign-out. */
export function AuthStatusMessage({ title, detail }: AuthStatusMessageProps) {
  return (
    <>
      <div className="w-14 h-14 rounded-full gradient-brand flex items-center justify-center">
        <Spinner size={26} className="text-white" />
      </div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted mt-1">{detail}</p>
      </div>
    </>
  );
}
