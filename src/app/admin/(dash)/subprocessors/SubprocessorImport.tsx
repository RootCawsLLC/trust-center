"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2, FileSpreadsheet } from "lucide-react";
import {
  parseSubprocessorFile,
  importSubprocessors,
  type ParsedSub,
} from "../content-actions";

export function SubprocessorImport() {
  const [rows, setRows] = useState<ParsedSub[] | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    start(async () => {
      const res = await parseSubprocessorFile(fd);
      if (!res.ok) setError(res.error);
      else {
        setRows(res.rows);
        setNote(res.note);
      }
    });
    e.target.value = "";
  }

  function confirmImport() {
    if (!rows) return;
    start(async () => {
      const res = await importSubprocessors(rows);
      if (!res.ok) setError(res.error);
      else {
        setRows(null);
        router.refresh();
      }
    });
  }

  return (
    <>
      <label className="btn-secondary cursor-pointer">
        <Upload size={16} /> Import from file
        <input
          type="file"
          accept=".xlsx,.xls,.csv,.docx"
          className="hidden"
          onChange={onFile}
          disabled={pending}
        />
      </label>
      {error && !rows && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {rows && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          onClick={() => setRows(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-lift"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
                <FileSpreadsheet size={18} className="text-brand-600" /> Review import
              </h2>
              <button className="btn-ghost p-1.5" onClick={() => setRows(null)}>
                <X size={18} />
              </button>
            </div>
            <p className="mb-3 text-sm text-ink-faint">{note}</p>
            {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
            <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-faint">
                  <tr>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Purpose</th>
                    <th className="px-3 py-2 font-medium">Location</th>
                    <th className="px-3 py-2 font-medium">Website</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 font-medium text-ink">{r.name}</td>
                      <td className="px-3 py-2 text-ink-soft">{r.purpose || "—"}</td>
                      <td className="px-3 py-2 text-ink-soft">{r.location || "—"}</td>
                      <td className="px-3 py-2 text-ink-soft">{r.website || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setRows(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={confirmImport} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" size={16} /> : null}
                Import {rows.length}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
