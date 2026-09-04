"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, X, Loader2 } from "lucide-react";
import { createUser, updateUser } from "./actions";
import { Pill } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: "OWNER" | "ADMIN" | "VIEWER";
  groupId: string | null;
  isActive: boolean;
  hasPassword: boolean;
  createdAt: string;
};

export type GroupOption = { id: string; name: string; defaultRole: string };

export function UserManager({ users, groups = [] }: { users: AdminUser[]; groups?: GroupOption[] }) {
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> New user
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-2.5 font-medium">User</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Auth</th>
              <th className="px-4 py-2.5 font-medium">Created</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{u.name ?? "—"}</div>
                  <div className="text-xs text-ink-faint">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  <Pill tone={u.role === "OWNER" ? "emerald" : "slate"}>{u.role}</Pill>
                </td>
                <td className="px-4 py-3">
                  {u.isActive ? (
                    <Pill tone="emerald">Active</Pill>
                  ) : (
                    <Pill tone="red">Disabled</Pill>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-ink-faint">
                  {u.hasPassword ? "Password" : "SSO only"}
                </td>
                <td className="px-4 py-3 text-xs text-ink-faint">
                  {formatDate(u.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button className="btn-ghost p-1.5" onClick={() => setEditing(u)}>
                    <Pencil size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(creating || editing) && (
        <UserForm
          user={editing}
          groups={groups}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function UserForm({
  user,
  groups,
  onClose,
  onSaved,
}: {
  user: AdminUser | null;
  groups: GroupOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = user ? await updateUser(user.id, fd) : await createUser(fd);
    setLoading(false);
    if (!res.ok) setError(res.error);
    else onSaved();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lift"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            {user ? "Edit user" : "New user"}
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost p-1.5">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              name="email"
              type="email"
              className="input disabled:bg-slate-100"
              defaultValue={user?.email}
              disabled={Boolean(user)}
              required
            />
          </div>
          <div>
            <label className="label">Name</label>
            <input name="name" className="input" defaultValue={user?.name ?? ""} required />
          </div>
          <div>
            <label className="label">Role</label>
            <select name="role" className="input" defaultValue={user?.role ?? "VIEWER"}>
              <option value="VIEWER">Viewer (read-only)</option>
              <option value="ADMIN">Admin (manage content)</option>
              <option value="OWNER">Owner (full control)</option>
            </select>
          </div>
          <div>
            <label className="label">Group</label>
            <select
              name="groupId"
              className="input"
              defaultValue={user?.groupId ?? ""}
              onChange={(e) => {
                const g = groups.find((x) => x.id === e.target.value);
                const form = e.target.form;
                if (g && form) {
                  const roleEl = form.elements.namedItem("role") as HTMLSelectElement | null;
                  if (roleEl) roleEl.value = g.defaultRole;
                }
              }}
            >
              <option value="">No group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} (inherits {g.defaultRole.toLowerCase()})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-faint">
              Picking a group sets the role to its default — you can still override it above.
            </p>
          </div>
          <div>
            <label className="label">
              Password{" "}
              {user && <span className="text-ink-faint">(leave blank to keep)</span>}
            </label>
            <input
              name="password"
              type="password"
              className="input"
              placeholder={user ? "••••••••" : "At least 10 characters"}
            />
          </div>
          {user && (
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={user.isActive}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
              />
              Active
            </label>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : null}
              {user ? "Save" : "Create user"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
