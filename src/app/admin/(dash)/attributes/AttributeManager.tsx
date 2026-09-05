"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, GripVertical, Check, X, Pencil, Loader2, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { saveOption, deleteOption, reorderOptions } from "./actions";

export type Option = { id: string; value: string; isActive: boolean; sortOrder: number };
export type TaxMeta = { key: string; label: string; group: string; hint?: string };

export function AttributeManager({
  taxonomies,
  optionsByKey,
}: {
  taxonomies: TaxMeta[];
  optionsByKey: Record<string, Option[]>;
}) {
  const [selected, setSelected] = useState(taxonomies[0]?.key ?? "");
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Local, optimistic copy of the selected set's order (drag reorders this
  // before the server round-trip so the row doesn't snap back).
  const serverOptions = optionsByKey[selected] ?? [];
  const [localOrder, setLocalOrder] = useState<Option[] | null>(null);
  const options = localOrder ?? serverOptions;

  const grouped = useMemo(() => {
    const m = new Map<string, TaxMeta[]>();
    for (const t of taxonomies) {
      if (!m.has(t.group)) m.set(t.group, []);
      m.get(t.group)!.push(t);
    }
    return [...m.entries()];
  }, [taxonomies]);

  const meta = taxonomies.find((t) => t.key === selected);
  const [dragId, setDragId] = useState<string | null>(null);
  const [newValue, setNewValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  function pick(key: string) {
    setSelected(key);
    setLocalOrder(null);
    setError(null);
    setEditingId(null);
    setNewValue("");
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else {
        after?.();
        router.refresh();
      }
    });
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const cur = [...options];
    const from = cur.findIndex((o) => o.id === dragId);
    const to = cur.findIndex((o) => o.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = cur.splice(from, 1);
    cur.splice(to, 0, moved);
    setLocalOrder(cur);
    setDragId(null);
    const ids = cur.map((o) => o.id);
    startTransition(async () => {
      const res = await reorderOptions(selected, ids);
      if (!res.ok) {
        setError(res.error ?? "Reorder failed.");
        setLocalOrder(null);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
      {/* Taxonomy picker */}
      <aside className="space-y-4">
        {grouped.map(([group, items]) => (
          <div key={group}>
            <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">{group}</p>
            <div className="space-y-0.5">
              {items.map((t) => {
                const count = (optionsByKey[t.key] ?? []).length;
                return (
                  <button
                    key={t.key}
                    onClick={() => pick(t.key)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-sm transition",
                      selected === t.key ? "bg-brand-50 font-medium text-brand-700" : "text-ink-soft hover:bg-slate-100",
                    )}
                  >
                    {t.label}
                    <span className="rounded-full bg-slate-100 px-1.5 text-xs text-ink-faint">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </aside>

      {/* Options for the selected taxonomy */}
      <div className="min-w-0">
        {meta && (
          <div className="mb-3">
            <h2 className="text-base font-semibold text-ink">
              {meta.group} · {meta.label}
            </h2>
            {meta.hint && <p className="text-sm text-ink-faint">{meta.hint}</p>}
            <p className="mt-1 text-xs text-ink-faint">Drag rows to reorder. Order and wording here drive the dropdowns across the admin and public site.</p>
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700 ring-1 ring-inset ring-red-200">{error}</div>
        )}

        {/* Add */}
        <form
          className="mb-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = newValue.trim();
            if (!v) return;
            run(() => saveOption(null, selected, v, true), () => setNewValue(""));
          }}
        >
          <input
            className="input"
            placeholder="Add an option…"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={pending || !newValue.trim()}>
            <Plus size={16} /> Add
          </button>
        </form>

        <div className="card divide-y divide-slate-100">
          {options.length === 0 ? (
            <div className="p-6 text-center text-sm text-ink-faint">No options yet — add one above.</div>
          ) : (
            options.map((o) => (
              <div
                key={o.id}
                draggable={editingId !== o.id}
                onDragStart={() => setDragId(o.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(o.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm",
                  dragId === o.id && "opacity-50",
                  !o.isActive && "bg-slate-50",
                )}
              >
                <GripVertical size={15} className="shrink-0 cursor-grab text-slate-400" />
                {editingId === o.id ? (
                  <>
                    <input
                      className="input h-8 py-1"
                      value={editValue}
                      autoFocus
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          run(() => saveOption(o.id, selected, editValue, o.isActive), () => setEditingId(null));
                        }
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <button className="btn-ghost p-1.5 text-emerald-600" onClick={() => run(() => saveOption(o.id, selected, editValue, o.isActive), () => setEditingId(null))}>
                      <Check size={15} />
                    </button>
                    <button className="btn-ghost p-1.5" onClick={() => setEditingId(null)}>
                      <X size={15} />
                    </button>
                  </>
                ) : (
                  <>
                    <span className={cn("flex-1 truncate", !o.isActive && "text-ink-faint line-through")}>{o.value}</span>
                    {!o.isActive && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] text-ink-faint">
                        <EyeOff size={10} /> Hidden
                      </span>
                    )}
                    <button
                      className="btn-ghost p-1.5 text-xs text-ink-soft"
                      title={o.isActive ? "Hide from dropdowns" : "Show in dropdowns"}
                      onClick={() => run(() => saveOption(o.id, selected, o.value, !o.isActive))}
                    >
                      {o.isActive ? "Hide" : "Show"}
                    </button>
                    <button
                      className="btn-ghost p-1.5"
                      title="Rename"
                      onClick={() => {
                        setEditingId(o.id);
                        setEditValue(o.value);
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="btn-ghost p-1.5 text-red-600 hover:bg-red-50"
                      title="Delete"
                      onClick={() => {
                        if (confirm(`Delete "${o.value}"? Records already tagged with it keep the value.`)) {
                          run(() => deleteOption(o.id));
                        }
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
        {pending && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-faint">
            <Loader2 size={12} className="animate-spin" /> Saving…
          </p>
        )}
      </div>
    </div>
  );
}
