"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { Pill } from "@/components/admin/ui";

export type FieldDef = {
  name: string;
  label: string;
  type: "text" | "textarea" | "select" | "checkbox" | "number" | "date";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  full?: boolean;
};

export type ColumnDef = { key: string; label: string; type?: "text" | "link" | "bool" };

type Item = Record<string, unknown> & { id: string };
type Result = { ok: true } | { ok: false; error: string };

export function ContentManager({
  items,
  columns,
  fields,
  newLabel,
  saveAction,
  deleteAction,
}: {
  items: Item[];
  columns: ColumnDef[];
  fields: FieldDef[];
  newLabel: string;
  saveAction: (id: string | null, fd: FormData) => Promise<Result>;
  deleteAction: (id: string) => Promise<Result>;
}) {
  const [editing, setEditing] = useState<Item | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onDelete(item: Item) {
    if (!confirm("Delete this item? This cannot be undone.")) return;
    setError(null);
    const res = await deleteAction(item.id);
    if (!res.ok) setError(res.error);
    else router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> {newLabel}
        </button>
      </div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}
      {items.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">Nothing here yet.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="px-4 py-2.5 font-medium">{c.label}</th>
                ))}
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} className="align-top">
                  {columns.map((c) => (
                    <td key={c.key} className="px-4 py-3 text-ink-soft">
                      <Cell value={item[c.key]} type={c.type} />
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button className="btn-ghost p-1.5" onClick={() => setEditing(item)}>
                        <Pencil size={15} />
                      </button>
                      <button
                        className="btn-ghost p-1.5 text-red-600 hover:bg-red-50"
                        onClick={() => onDelete(item)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(creating || editing) && (
        <ContentForm
          item={editing}
          fields={fields}
          saveAction={saveAction}
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

function Cell({ value, type }: { value: unknown; type?: string }) {
  if (type === "bool") return value ? <Pill tone="emerald">Yes</Pill> : <Pill tone="slate">No</Pill>;
  if (type === "link" && typeof value === "string" && value) {
    return (
      <a href={value} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">
        {value.replace(/^https?:\/\//, "")}
      </a>
    );
  }
  const str = value == null ? "—" : String(value);
  return <span className="line-clamp-2">{str || "—"}</span>;
}

function ContentForm({
  item,
  fields,
  saveAction,
  onClose,
  onSaved,
}: {
  item: Item | null;
  fields: FieldDef[];
  saveAction: (id: string | null, fd: FormData) => Promise<Result>;
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
    const res = await saveAction(item?.id ?? null, fd);
    setLoading(false);
    if (!res.ok) setError(res.error);
    else onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onSubmit={onSubmit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-lift"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">{item ? "Edit" : "New"}</h2>
          <button type="button" onClick={onClose} className="btn-ghost p-1.5">
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {fields.map((f) => {
            const val = item?.[f.name];
            return (
              <div key={f.name} className={f.full || f.type === "textarea" ? "col-span-2" : ""}>
                {f.type === "checkbox" ? (
                  <label className="flex items-center gap-2 text-sm text-ink-soft">
                    <input
                      type="checkbox"
                      name={f.name}
                      defaultChecked={item ? Boolean(val) : true}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
                    />
                    {f.label}
                  </label>
                ) : (
                  <>
                    <label className="label">{f.label}</label>
                    {f.type === "textarea" ? (
                      <textarea name={f.name} className="input min-h-28" defaultValue={val ? String(val) : ""} placeholder={f.placeholder} required={f.required} />
                    ) : f.type === "select" ? (
                      <select name={f.name} className="input" defaultValue={val ? String(val) : f.options?.[0]?.value}>
                        {f.options?.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                        name={f.name}
                        className="input"
                        defaultValue={val != null ? String(val) : ""}
                        placeholder={f.placeholder}
                        required={f.required}
                      />
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : null}
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
