"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { saveNda, deleteNda } from "./actions";
import { Pill } from "@/components/admin/ui";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

export type AdminNda = {
  id: string;
  name: string;
  bodyMarkdown: string;
  contentHtml: string | null;
  fileName: string | null;
  isDefault: boolean;
  isActive: boolean;
  documentCount: number;
  acceptanceCount: number;
};

export function NdaManager({ templates }: { templates: AdminNda[] }) {
  const [editing, setEditing] = useState<AdminNda | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onDelete(t: AdminNda) {
    if (!confirm(`Delete NDA template "${t.name}"?`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteNda(t.id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> New template
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {templates.map((t) => (
          <div key={t.id} className="card flex items-start justify-between p-5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-ink">{t.name}</h3>
                {t.isDefault && <Pill tone="emerald">Default</Pill>}
                {!t.isActive && <Pill tone="slate">Inactive</Pill>}
              </div>
              <p className="mt-1 line-clamp-2 max-w-xl text-sm text-ink-faint">
                {t.bodyMarkdown}
              </p>
              <p className="mt-2 text-xs text-ink-faint">
                {t.documentCount} document(s) · {t.acceptanceCount} acceptance(s)
              </p>
            </div>
            <div className="flex gap-1">
              <button className="btn-ghost p-1.5" onClick={() => setEditing(t)}>
                <Pencil size={15} />
              </button>
              <button
                className="btn-ghost p-1.5 text-red-600 hover:bg-red-50"
                onClick={() => onDelete(t)}
                disabled={pending}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {(creating || editing) && (
        <NdaForm
          tmpl={editing}
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

function NdaForm({
  tmpl,
  onClose,
  onSaved,
}: {
  tmpl: AdminNda | null;
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
    const res = await saveNda(tmpl?.id ?? null, fd);
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
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-lift"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            {tmpl ? "Edit NDA template" : "New NDA template"}
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost p-1.5">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input name="name" className="input" defaultValue={tmpl?.name} required />
          </div>
          <div>
            <label className="label">NDA text (rich text)</label>
            <RichTextEditor
              name="contentHtml"
              defaultValue={tmpl?.contentHtml ?? ""}
              placeholder="Paste or write the NDA — bold, italics, and bullet points are supported."
            />
            <p className="mt-1 text-xs text-ink-faint">
              Formatting is preserved for signers. The accepted text is hashed into
              each acceptance record.
            </p>
          </div>
          <div>
            <label className="label">Official copy (optional)</label>
            <input type="file" name="file" accept=".pdf,.doc,.docx" className="input py-1.5" />
            <p className="mt-1 text-xs text-ink-faint">
              {tmpl?.fileName ? (
                <>Current: {tmpl.fileName} — upload to replace. </>
              ) : null}
              Attach your own signed NDA (PDF/DOCX). Signers can download it alongside the click-through text above.
            </p>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                name="isDefault"
                defaultChecked={tmpl?.isDefault}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
              />
              Default template
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input
                type="checkbox"
                name="isActive"
                defaultChecked={tmpl ? tmpl.isActive : true}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
              />
              Active
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : null}
              {tmpl ? "Save" : "Create"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
