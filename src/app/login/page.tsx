"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { Role } from "@/lib/roles";
import { DEMO_USERS, ROLE_LABELS } from "@/lib/roles";

const roles: Role[] = ["viewer", "creator", "admin"];

export default function LoginPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<Role>("creator");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Image
            src="/happinesshub-logo.png"
            alt="HappinessHub"
            width={280}
            height={120}
            className="mx-auto object-contain mb-4"
            priority
          />
          <p className="text-muted text-sm tracking-widest uppercase">
            Pleasure. Passion. Privacy.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          <h1 className="text-xl font-semibold mb-1">Welcome back</h1>
          <p className="text-sm text-muted mb-6">
            Sign in to access your dashboard. Choose a role to explore role-based features.
          </p>

          <div className="space-y-3 mb-6">
            <label className="text-sm font-medium text-muted">Select your role</label>
            {roles.map((role) => {
              const user = DEMO_USERS[role];
              const isSelected = selectedRole === role;

              return (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/30 hover:bg-surface-elevated"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full gradient-brand flex items-center justify-center text-white text-sm font-bold shrink-0">
                    {user.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-muted">{user.email}</p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      isSelected
                        ? "bg-primary text-white"
                        : "bg-surface-elevated text-muted"
                    }`}
                  >
                    {ROLE_LABELS[role]}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full gradient-brand text-white font-medium py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Continue to Dashboard"}
          </button>

          <p className="text-[11px] text-muted text-center mt-4">
            Demo mode — role selection controls which features you can access.
          </p>
        </div>
      </div>
    </div>
  );
}
