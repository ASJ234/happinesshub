import { Lock } from "lucide-react";
import type { User } from "@/lib/roles";
import { Field } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { inputLargeClass } from "@/components/ui/styles";

interface AccountDetailsProps {
  user: User;
}

/**
 * Display name and username. The admin account's credentials are managed by
 * the developer only, so they are shown read-only for admins.
 */
export function AccountDetails({ user }: AccountDetailsProps) {
  const locked = user.role === "admin";
  const inputClass = `${inputLargeClass} ${locked ? "opacity-60 cursor-not-allowed" : ""}`;

  return (
    <>
      {locked && (
        <Alert tone="info">
          Admin credentials can only be changed by the developer.
        </Alert>
      )}
      <Field label={locked ? <LockedLabel text="Display Name" /> : "Display Name"}>
        <input
          type="text"
          defaultValue={user.name}
          readOnly={locked}
          disabled={locked}
          className={inputClass}
        />
      </Field>
      <Field label={locked ? <LockedLabel text="Username" /> : "Username"}>
        <input
          type="text"
          defaultValue={user.username}
          readOnly={locked}
          disabled={locked}
          className={inputClass}
        />
      </Field>
    </>
  );
}

function LockedLabel({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Lock size={12} /> {text}
    </span>
  );
}
