"use client";

import { useState } from "react";
import { X, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export type ScopeAttr = { key: string; label: string; enforced: boolean; options: string[] };

// A reusable ABAC scope editor: per attribute, a chip multi-select. An empty
// selection on an attribute means "no restriction on that attribute".
export function ScopeModal({
  title,
  subtitle,
  attributes,
  current,
  onClose,
  onSave,
}: {
  title: string;
  subtitle?: string;
  attributes: ScopeAttr[];
  current: Record<string, string[]>;
  onClose: () => void;
  onSave: (scopes: Record<string, string[]>) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [sel, setSel] = useState<Record<string, string[]>>(() => {
    const s: Record<string, string[]> = {};
    for (const a of attributes) s[a.key] = current[a.key] ?? [];
    return s;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(attr: string, value: string) {
    setSel((prev) => {
      const cur = prev[attr] ?? [];
      return { ...prev, [attr]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] };
    });
  }

  function save() {
    setSaving(true);
    setError(null);
    onSave(sel).then((res) => {
      setSaving(false);
      if (!res.ok) setError(res.error ?? "Could not save.");
      else onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-lift" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><ShieldCheck size={18} /> {title}</h2>
          <button className="btn-ghost p-1.5" onClick={onClose}><X size={18} /></button>
        </div>
        {subtitle && <p className="mb-4 text-sm text-ink-faint">{subtitle}</p>}

        <div className="space-y-5">
          {attributes.map((a) => (
            <div key={a.key}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-medium text-ink">{a.label}</span>
                {a.enforced ? (
                  <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">Enforced</span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-faint" title="Assignable now; enforcement applies once records are tagged with this attribute.">Assignable</span>
                )}
                {(sel[a.key]?.length ?? 0) === 0 && <span className="text-xs text-ink-faint">— no restriction</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {a.options.length === 0 && <span className="text-xs text-ink-faint">No values defined — add them in the Attribute manager.</span>}
                {a.options.map((o) => {
                  const on = sel[a.key]?.includes(o);
                  return (
                    <button
                      type="button"
                      key={o}
                      onClick={() => toggle(a.key, o)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition",
                        on ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-300 text-ink-soft hover:border-brand-300",
                      )}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? <Loader2 className="animate-spin" size={16} /> : null} Save scope</button>
        </div>
      </div>
    </div>
  );
}
