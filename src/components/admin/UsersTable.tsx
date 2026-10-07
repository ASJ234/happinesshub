"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ROLE_LABELS, type Role } from "@/lib/roles";

export interface AdminUserRow {
  id: string;
  username: string;
  display_name: string | null;
  role: Role;
  created_at: string;
}

const ROLES: Role[] = ["viewer", "creator", "admin"];

const selectClass =
  "bg-surface-elevated border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50";
const inputClass =
  "bg-surface-elevated border border-border rounded-lg px-2.5 py-1.5 text-xs w-full min-w-32 focus:outline-none focus:ring-2 focus:ring-primary/50";

interface UsersTableProps {
  users: AdminUserRow[];
  currentUserId: string;
}

export function UsersTable({ users, currentUserId }: UsersTableProps) {
  const router = useRouter();
  const [rows, setRows] = useState(users);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function patchRow(id: string, patch: Partial<AdminUserRow>) {
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row))
    );
  }

  async function saveRow(row: AdminUserRow) {
    setBusyId(row.id);
    setMessage(null);

    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: row.id,
        role: row.role,
        display_name: row.display_name ?? row.username,
      }),
    });

    const body = await response.json().catch(() => null);
    setBusyId(null);

    if (!response.ok) {
      setMessage(body?.error ?? "Could not update user");
      return;
    }

    setMessage(`Saved ${row.username}`);
    router.refresh();
  }

  async function deleteUser(row: AdminUserRow) {
    if (
      !window.confirm(
        `Delete @${row.username}? This removes their account and all their videos.`
      )
    ) {
      return;
    }

    setBusyId(row.id);
    setMessage(null);

    const response = await fetch(`/api/admin/users?id=${row.id}`, {
      method: "DELETE",
    });

    const body = await response.json().catch(() => null);
    setBusyId(null);

    if (!response.ok) {
      setMessage(body?.error ?? "Could not delete user");
      return;
    }

    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setMessage(`Deleted ${row.username}`);
    router.refresh();
  }

  return (
    <div className="overflow-x-auto">
      {message && (
        <p className="px-4 pt-3 text-xs text-muted">{message}</p>
      )}
      <table className="w-full text-sm min-w-[720px]">
        <thead>
          <tr className="border-b border-border text-muted text-left">
            <th className="p-4 font-medium">User</th>
            <th className="p-4 font-medium">Display name</th>
            <th className="p-4 font-medium">Role</th>
            <th className="p-4 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isSelf = row.id === currentUserId;
            return (
              <tr
                key={row.id}
                className="border-b border-border last:border-0 hover:bg-surface-elevated"
              >
                <td className="p-4">
                  <p className="font-medium">@{row.username}</p>
                  <p className="text-xs text-muted">
                    joined {new Date(row.created_at).toLocaleDateString()}
                    {isSelf && " · you"}
                  </p>
                </td>
                <td className="p-4">
                  <input
                    type="text"
                    value={row.display_name ?? ""}
                    maxLength={80}
                    onChange={(e) => patchRow(row.id, { display_name: e.target.value })}
                    className={inputClass}
                  />
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <select
                      value={row.role}
                      onChange={(e) =>
                        patchRow(row.id, { role: e.target.value as Role })
                      }
                      disabled={isSelf}
                      className={selectClass}
                    >
                      {ROLES.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                    <StatusBadge status={ROLE_LABELS[row.role]} />
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => saveRow(row)}
                      disabled={busyId === row.id || isSelf}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-medium disabled:opacity-50"
                      title={isSelf ? "You cannot edit your own account" : undefined}
                    >
                      <Save size={13} />
                      Save
                    </button>
                    <button
                      onClick={() => deleteUser(row)}
                      disabled={busyId === row.id || isSelf}
                      className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-medium disabled:opacity-50"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
