"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Lock, Globe, Loader2, Upload } from "lucide-react";
import { createDocument, updateDocument, deleteDocument } from "./actions";
import { bytesToSize } from "@/lib/utils";
import { CATEGORY_SINGULAR } from "@/lib/constants";
import { Pill } from "@/components/admin/ui";
import type { DocumentCategory } from "@prisma/client";

export type AdminDoc = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  visibility: "PUBLIC" | "PRIVATE";
  version: string;
  isPublished: boolean;
  fileName: string;
  sizeBytes: number;
  ndaTemplateId: string | null;
  requestCount: number;
};

const CATEGORIES: DocumentCategory[] = [
  "POLICY",
  "PROCEDURE",
  "AUDIT",
  "CERTIFICATION",
  "REPORT",
  "WHITEPAPER",
  "OTHER",
];

export function DocumentManager({
  docs,
  ndaTemplates,
}: {
  docs: AdminDoc[];
  ndaTemplates: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState<AdminDoc | null>(null);
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete(doc: AdminDoc) {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteDocument(doc.id);
      if (!res.ok) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> New document
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </div>
      )}

      {docs.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">
          No documents yet. Add your first one.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-2.5 font-medium">Title</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Visibility</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Requests</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{d.title}</div>
                    <div className="text-xs text-ink-faint">
                      {d.fileName} · {bytesToSize(d.sizeBytes)} · v{d.version}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {CATEGORY_SINGULAR[d.category as DocumentCategory]}
                  </td>
                  <td className="px-4 py-3">
                    {d.visibility === "PRIVATE" ? (
                      <Pill tone="amber">
                        <Lock size={11} className="mr-1" /> Private
                      </Pill>
                    ) : (
                      <Pill tone="emerald">
                        <Globe size={11} className="mr-1" /> Public
                      </Pill>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {d.isPublished ? (
                      <Pill tone="emerald">Published</Pill>
                    ) : (
                      <Pill tone="slate">Draft</Pill>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{d.requestCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        className="btn-ghost p-1.5"
                        onClick={() => setEditing(d)}
                        aria-label="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="btn-ghost p-1.5 text-red-600 hover:bg-red-50"
                        onClick={() => onDelete(d)}
                        disabled={pending}
                        aria-label="Delete"
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
        <DocumentForm
          doc={editing}
          ndaTemplates={ndaTemplates}
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

function DocumentForm({
  doc,
  ndaTemplates,
  onClose,
  onSaved,
}: {
  doc: AdminDoc | null;
  ndaTemplates: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [visibility, setVisibility] = useState(doc?.visibility ?? "PRIVATE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = doc ? await updateDocument(doc.id, fd) : await createDocument(fd);
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
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-lift"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">
            {doc ? "Edit document" : "New document"}
          </h2>
          <button type="button" onClick={onClose} className="btn-ghost p-1.5">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input name="title" className="input" defaultValue={doc?.title} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              name="description"
              className="input min-h-20"
              defaultValue={doc?.description ?? ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Category</label>
              <select name="category" className="input" defaultValue={doc?.category ?? "POLICY"}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_SINGULAR[c]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Version</label>
              <input name="version" className="input" defaultValue={doc?.version ?? "1.0"} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Visibility</label>
              <select
                name="visibility"
                className="input"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as "PUBLIC" | "PRIVATE")}
              >
                <option value="PUBLIC">Public (form only)</option>
                <option value="PRIVATE">Private (NDA required)</option>
              </select>
            </div>
            {visibility === "PRIVATE" && (
              <div>
                <label className="label">NDA template</label>
                <select
                  name="ndaTemplateId"
                  className="input"
                  defaultValue={doc?.ndaTemplateId ?? ""}
                >
                  <option value="">Use default</option>
                  {ndaTemplates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="label">
              File {doc && <span className="text-ink-faint">(leave empty to keep current)</span>}
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-ink-soft hover:border-brand-400">
              <Upload size={16} />
              <span>{doc ? doc.fileName : "Choose a file (PDF, etc.)"}</span>
              <input name="file" type="file" className="hidden" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="isPublished"
              defaultChecked={doc ? doc.isPublished : true}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
            />
            Published (visible on the public site)
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : null}
              {doc ? "Save changes" : "Create document"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
