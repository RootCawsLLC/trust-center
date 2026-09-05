"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Pencil, Trash2, X, Lock, Globe, Loader2, Upload, ChevronUp, ChevronDown, ChevronsUpDown, Eye, History } from "lucide-react";
import { createDocument, updateDocument, deleteDocument } from "./actions";
import { bytesToSize } from "@/lib/utils";
import { CATEGORY_SINGULAR, DOC_STATUSES } from "@/lib/constants";

export type DocTaxonomies = { frameworks: string[]; industries: string[]; regions: string[] };
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
  status: string;
  fileName: string;
  sizeBytes: number;
  ndaTemplateId: string | null;
  requestCount: number;
  industries: string[];
  regions: string[];
  frameworks: string[];
};

const STATUS_TONE: Record<string, "slate" | "amber" | "emerald" | "red" | "blue"> = {
  Draft: "slate",
  "In review": "amber",
  Planning: "blue",
  Published: "emerald",
  Archived: "slate",
  Revoked: "red",
};

const CATEGORIES: DocumentCategory[] = [
  "POLICY",
  "PROCEDURE",
  "AUDIT",
  "CERTIFICATION",
  "REPORT",
  "WHITEPAPER",
  "LEGAL",
  "OTHER",
];

export function DocumentManager({
  docs,
  ndaTemplates,
  taxonomies,
}: {
  docs: AdminDoc[];
  ndaTemplates: { id: string; name: string }[];
  taxonomies: DocTaxonomies;
}) {
  const [editing, setEditing] = useState<AdminDoc | null>(null);
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: keyof AdminDoc; dir: "asc" | "desc" } | null>(null);

  const sortedDocs = sort
    ? [...docs].sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        let cmp: number;
        if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
        else cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
        return sort.dir === "asc" ? cmp : -cmp;
      })
    : docs;
  function toggleSort(key: keyof AdminDoc) {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }
  function SortTh({ label, k }: { label: string; k: keyof AdminDoc }) {
    return (
      <th className="px-4 py-2.5 font-medium">
        <button onClick={() => toggleSort(k)} className="inline-flex items-center gap-1 hover:text-ink">
          {label}
          {sort?.key === k ? (
            sort.dir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
          ) : (
            <ChevronsUpDown size={13} className="text-slate-300" />
          )}
        </button>
      </th>
    );
  }

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
                <SortTh label="Title" k="title" />
                <SortTh label="Category" k="category" />
                <SortTh label="Visibility" k="visibility" />
                <SortTh label="Status" k="status" />
                <SortTh label="Requests" k="requestCount" />
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedDocs.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3">
                    <a
                      href={`/api/admin/doc-file/${d.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand-700 hover:underline"
                      title="View the stored document"
                    >
                      {d.title}
                    </a>
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
                    <Pill tone={STATUS_TONE[d.status] ?? "slate"}>{d.status}</Pill>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{d.requestCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/admin/documents/${d.id}/versions`}
                        className="btn-ghost p-1.5"
                        aria-label="Version history"
                        title="Version history"
                      >
                        <History size={15} />
                      </Link>
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
          taxonomies={taxonomies}
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

function TagChecks({
  name,
  label,
  options,
  selected,
}: {
  name: string;
  label: string;
  options: string[];
  selected: string[];
}) {
  const set = new Set(selected);
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <label key={o} className="cursor-pointer">
            <input
              type="checkbox"
              name={name}
              value={o}
              defaultChecked={set.has(o)}
              className="peer sr-only"
            />
            <span className="inline-block rounded-full border border-slate-300 px-2.5 py-1 text-xs text-ink-soft transition peer-checked:border-brand-500 peer-checked:bg-brand-50 peer-checked:text-brand-700 peer-hover:border-brand-300">
              {o}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function DocumentForm({
  doc,
  ndaTemplates,
  taxonomies,
  onClose,
  onSaved,
}: {
  doc: AdminDoc | null;
  ndaTemplates: { id: string; name: string }[];
  taxonomies: DocTaxonomies;
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
          <TagChecks name="frameworks" label="Frameworks" options={taxonomies.frameworks} selected={doc?.frameworks ?? []} />
          <TagChecks name="industries" label="Industries" options={taxonomies.industries} selected={doc?.industries ?? []} />
          <TagChecks name="regions" label="Regions" options={taxonomies.regions} selected={doc?.regions ?? []} />

          <div>
            <label className="label">
              File {doc && <span className="text-ink-faint">(leave empty to keep current)</span>}
            </label>
            {doc && (
              <a
                href={`/api/admin/doc-file/${doc.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
              >
                <Eye size={14} /> View current file ({doc.fileName})
              </a>
            )}
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm text-ink-soft hover:border-brand-400">
              <Upload size={16} />
              <span>{doc ? doc.fileName : "Choose a file (PDF, etc.)"}</span>
              <input name="file" type="file" className="hidden" />
            </label>
          </div>
          <div>
            <label className="label">Status</label>
            <select name="status" className="input" defaultValue={doc ? doc.status : "Draft"}>
              {DOC_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-faint">
              Only <strong>Published</strong> documents appear on the public trust center.
            </p>
          </div>

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
