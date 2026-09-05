"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, X, Check, Loader2, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { createDashboard, renameDashboard, deleteDashboard } from "./actions";

export type DashTab = { id: string; name: string };

export function DashboardBar({ dashboards, selectedId }: { dashboards: DashTab[]; selectedId: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selected = dashboards.find((d) => d.id === selectedId);

  function create() {
    if (!newName.trim()) return;
    setError(null);
    start(async () => {
      const res = await createDashboard(newName);
      if (!res.ok) setError(res.error);
      else { setCreating(false); setNewName(""); router.push(`/admin/metrics?dash=${res.id}`); }
    });
  }
  function rename() {
    if (!editName.trim()) return;
    start(async () => {
      const res = await renameDashboard(selectedId, editName);
      if (!res.ok) setError(res.error);
      else { setEditing(false); router.refresh(); }
    });
  }
  function remove() {
    if (!confirm(`Delete the "${selected?.name}" view and its charts?`)) return;
    start(async () => {
      const res = await deleteDashboard(selectedId);
      if (!res.ok) setError(res.error);
      else router.push("/admin/metrics");
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200">
        {dashboards.map((d) => (
          <Link
            key={d.id}
            href={`/admin/metrics?dash=${d.id}`}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition",
              d.id === selectedId ? "border-brand-600 text-brand-700" : "border-transparent text-ink-faint hover:text-ink",
            )}
          >
            <LayoutDashboard size={14} /> {d.name}
          </Link>
        ))}
        <button onClick={() => setCreating(true)} className="ml-1 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-medium text-ink-faint hover:bg-slate-100 hover:text-ink">
          <Plus size={14} /> New view
        </button>
      </div>

      {/* Rename / delete controls for the active view */}
      {selected && (
        <div className="mt-2 flex items-center gap-2 text-xs text-ink-faint">
          {editing ? (
            <>
              <input className="input h-8 w-56 py-1" value={editName} autoFocus onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && rename()} />
              <button className="btn-ghost p-1 text-emerald-600" onClick={rename}><Check size={15} /></button>
              <button className="btn-ghost p-1" onClick={() => setEditing(false)}><X size={15} /></button>
            </>
          ) : (
            <>
              <span>Viewing <span className="font-medium text-ink-soft">{selected.name}</span></span>
              <button className="inline-flex items-center gap-1 hover:text-brand-700" onClick={() => { setEditing(true); setEditName(selected.name); }}><Pencil size={12} /> Rename</button>
              <button className="inline-flex items-center gap-1 hover:text-red-600" onClick={remove} disabled={busy}><Trash2 size={12} /> Delete view</button>
            </>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={() => setCreating(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lift" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">New dashboard view</h2>
              <button className="btn-ghost p-1.5" onClick={() => setCreating(false)}><X size={16} /></button>
            </div>
            <input className="input" placeholder="e.g. Q1 2026, Year over year" value={newName} autoFocus onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} />
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
              <button className="btn-primary" onClick={create} disabled={busy || !newName.trim()}>{busy ? <Loader2 className="animate-spin" size={16} /> : null} Create view</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
