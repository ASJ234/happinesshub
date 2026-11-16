"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import type { User } from "@/lib/roles";
import { Field } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Alert";
import { inputLargeClass } from "@/components/ui/styles";

interface AccountDetailsProps {
  user: User;
}

/**
 * Display name and username. Users can change their own; the admin account's
 * credentials are managed by the developer only, so admins see them read-only.
 */
export function AccountDetails({ user }: AccountDetailsProps) {
  const router = useRouter();
  const locked = user.role === "admin";
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const inputClass = `${inputLargeClass} ${locked ? "opacity-60 cursor-not-allowed" : ""}`;
  const unchanged = name.trim() === user.name && username.trim().toLowerCase() === user.username;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (locked || unchanged) return;

    setSaving(true);
    setMessage(null);

    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: name, username }),
    });
    const result = await response.json().catch(() => ({}));

    setSaving(false);

    if (!response.ok) {
      setMessage({ tone: "error", text: result.error ?? "Could not save changes" });
      return;
    }

    setMessage({ tone: "success", text: "Changes saved. Use your new username next time you sign in." });
    router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-5">
      {locked && (
        <Alert tone="info">Admin credentials can only be changed by the developer.</Alert>
      )}
      <Field label={locked ? <LockedLabel text="Display Name" /> : "Display Name"}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={locked}
          maxLength={50}
          className={inputClass}
        />
      </Field>
      <Field label={locked ? <LockedLabel text="Username" /> : "Username"}>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={locked}
          maxLength={20}
          autoCapitalize="none"
          className={inputClass}
        />
      </Field>
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      {!locked && (
        <button
          type="submit"
          disabled={saving || unchanged}
          className="gradient-brand text-white font-medium px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      )}
    </form>
  );
}

function LockedLabel({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Lock size={12} /> {text}
    </span>
  );
}
