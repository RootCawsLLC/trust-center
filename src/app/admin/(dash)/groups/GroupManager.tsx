"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Loader2, ShieldCheck, Lock } from "lucide-react";
import { Pill } from "@/components/admin/ui";
import { saveGroup, deleteGroup, saveGroupPermissions } from "../access-actions";

type Level = "none" | "view" | "edit";
export type ModuleDef = { key: string; label: string; ownerOnly?: boolean };
export type AdminGroup = {
  id: string;
  name: string;
  description: string;
  defaultRole: string;
  members: number;
  permissions: Record<string, Level>;
};

export function GroupManager({ groups, modules }: { groups: AdminGroup[]; modules: ModuleDef[] }) {
  const [editing, setEditing] = useState<AdminGroup | null>(null);
  const [creating, setCreating] = useState(false);
  const [perms, setPerms] = useState<AdminGroup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onDelete(g: AdminGroup) {
    if (!confirm(`Delete group "${g.name}"? Members are unassigned, not deleted.`)) return;
    setError(null);
    start(async () => {
      const res = await deleteGroup(g.id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> New group
        </button>
      </div>
      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">{error}</div>}

      <div className="space-y-3">
        {groups.length === 0 && <div className="card p-8 text-center text-sm text-ink-faint">No groups yet.</div>}
        {groups.map((g) => {
          const customized = Object.keys(g.permissions ?? {}).length;
          return (
            <div key={g.id} className="card flex items-start justify-between p-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-ink">{g.name}</h3>
                  <Pill tone="slate">{g.defaultRole}</Pill>
                  <span className="text-xs text-ink-faint">{g.members} member(s)</span>
                </div>
                {g.description && <p className="mt-1 text-sm text-ink-faint">{g.description}</p>}
                <p className="mt-1.5 text-xs text-ink-faint">
                  {customized > 0 ? `${customized} module permission(s) customized` : "Using role defaults for all modules"}
                </p>
              </div>
              <div className="flex gap-1">
                <button className="btn-ghost gap-1 px-2 text-sm text-brand-700" onClick={() => setPerms(g)}>
                  <ShieldCheck size={15} /> Permissions
                </button>
                <button className="btn-ghost p-1.5" onClick={() => setEditing(g)}><Pencil size={15} /></button>
                <button className="btn-ghost p-1.5 text-red-600 hover:bg-red-50" onClick={() => onDelete(g)} disabled={pending}><Trash2 size={15} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {(creating || editing) && (
        <GroupForm group={editing} onClose={() => { setCreating(false); setEditing(null); }} onSaved={() => { setCreating(false); setEditing(null); router.refresh(); }} />
      )}
      {perms && (
        <PermissionMatrix group={perms} modules={modules} onClose={() => setPerms(null)} onSaved={() => { setPerms(null); router.refresh(); }} />
      )}
    </div>
  );
}

function GroupForm({ group, onClose, onSaved }: { group: AdminGroup | null; onClose: () => void; onSaved: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await saveGroup(group?.id ?? null, new FormData(e.currentTarget));
    setLoading(false);
    if (!res.ok) setError(res.error);
    else onSaved();
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lift">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{group ? "Edit group" : "New group"}</h2>
          <button type="button" onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">Name</label>
            <input name="name" className="input" defaultValue={group?.name} required placeholder="InfoSec" />
          </div>
          <div>
            <label className="label">Default role</label>
            <select name="defaultRole" className="input" defaultValue={group?.defaultRole ?? "VIEWER"}>
              <option value="VIEWER">Viewer</option>
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
            </select>
            <p className="mt-1 text-xs text-ink-faint">Modules left unset in the permission matrix fall back to this role.</p>
          </div>
          <div>
            <label className="label">Description</label>
            <input name="description" className="input" defaultValue={group?.description} />
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? <Loader2 className="animate-spin" size={16} /> : null} Save</button>
        </div>
      </form>
    </div>
  );
}

const LEVELS: { value: Level; label: string }[] = [
  { value: "none", label: "No access" },
  { value: "view", label: "View only" },
  { value: "edit", label: "Edit" },
];

function PermissionMatrix({ group, modules, onClose, onSaved }: { group: AdminGroup; modules: ModuleDef[]; onClose: () => void; onSaved: () => void }) {
  const [matrix, setMatrix] = useState<Record<string, Level | "">>(() => {
    const m: Record<string, Level | ""> = {};
    for (const mod of modules) m[mod.key] = (group.permissions?.[mod.key] as Level) ?? "";
    return m;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setLoading(true);
    setError(null);
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(matrix)) if (v) clean[k] = v;
    saveGroupPermissions(group.id, clean).then((res) => {
      setLoading(false);
      if (!res.ok) setError(res.error);
      else onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-lift">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Permissions · {group.name}</h2>
          <button type="button" onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <p className="mb-4 text-sm text-ink-faint">
          What members of this group can do in each section. Leave a row on “Default” to inherit the group&rsquo;s role ({group.defaultRole}).
        </p>
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-2.5 font-medium">Section</th>
                <th className="px-4 py-2.5 font-medium">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {modules.map((mod) => (
                <tr key={mod.key}>
                  <td className="px-4 py-2.5 font-medium text-ink">
                    {mod.label}
                    {mod.ownerOnly && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-faint"><Lock size={9} /> Owner only</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {mod.ownerOnly ? (
                      <span className="text-xs text-ink-faint">Restricted to Owners</span>
                    ) : (
                      <select
                        className="input h-9 w-auto py-1"
                        value={matrix[mod.key]}
                        onChange={(e) => setMatrix((m) => ({ ...m, [mod.key]: e.target.value as Level | "" }))}
                      >
                        <option value="">Default ({group.defaultRole})</option>
                        {LEVELS.map((l) => (<option key={l.value} value={l.value}>{l.label}</option>))}
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button className="btn-primary" onClick={save} disabled={loading}>{loading ? <Loader2 className="animate-spin" size={16} /> : null} Save permissions</button>
        </div>
      </div>
    </div>
  );
}
