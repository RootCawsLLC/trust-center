"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, X, Loader2, Trash2, FileSpreadsheet, ArrowRight } from "lucide-react";
import { Pill } from "@/components/admin/ui";
import { createQuestionnaire, deleteQuestionnaire } from "./actions";

export type QListItem = {
  id: string;
  name: string;
  requesterEmail: string | null;
  status: string;
  total: number;
  approved: number;
  createdAt: string;
};

export function QuestionnaireList({ items }: { items: QListItem[] }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [busy, start] = useTransition();

  function remove(id: string) {
    if (!confirm("Delete this questionnaire?")) return;
    start(async () => {
      await deleteQuestionnaire(id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> New questionnaire
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">
          No questionnaires yet. Upload a prospect&rsquo;s questionnaire (or paste the questions) and we&rsquo;ll draft answers from your answer library.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((q) => (
            <div key={q.id} className="card flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/questionnaires/${q.id}`} className="font-medium text-ink hover:text-brand-700">{q.name}</Link>
                  <Pill tone={q.status === "complete" ? "emerald" : "amber"}>{q.status === "complete" ? "Complete" : "In progress"}</Pill>
                </div>
                <div className="mt-1 text-xs text-ink-faint">
                  {q.approved}/{q.total} approved{q.requesterEmail && <> · {q.requesterEmail}</>} · {new Date(q.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Link href={`/admin/questionnaires/${q.id}`} className="btn-ghost text-sm text-brand-700">Open <ArrowRight size={14} /></Link>
                <button className="btn-ghost p-1.5 text-red-600 hover:bg-red-50" onClick={() => remove(q.id)} disabled={busy}><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && <CreateModal onClose={() => setCreating(false)} />}
    </div>
  );
}

function CreateModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<"paste" | "upload">("paste");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await createQuestionnaire(new FormData(e.currentTarget));
    setLoading(false);
    if (!res.ok) setError(res.error);
    else if (res.id) router.push(`/admin/questionnaires/${res.id}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lift">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">New questionnaire</h2>
          <button type="button" onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Name</label>
              <input name="name" className="input" placeholder="Acme security review" required />
            </div>
            <div>
              <label className="label">Requester email (optional)</label>
              <input name="requesterEmail" type="email" className="input" placeholder="reviewer@acme.com" />
            </div>
          </div>

          <div className="flex gap-2 text-sm">
            <button type="button" onClick={() => setMode("paste")} className={`rounded-lg px-3 py-1.5 font-medium ${mode === "paste" ? "bg-brand-50 text-brand-700" : "text-ink-faint hover:bg-slate-100"}`}>Paste questions</button>
            <button type="button" onClick={() => setMode("upload")} className={`rounded-lg px-3 py-1.5 font-medium ${mode === "upload" ? "bg-brand-50 text-brand-700" : "text-ink-faint hover:bg-slate-100"}`}>Upload file</button>
          </div>

          {mode === "paste" ? (
            <div>
              <label className="label">Questions (one per line)</label>
              <textarea name="questions" className="input min-h-40" placeholder={"Do you encrypt data at rest?\nWhat is your RTO?\nDo you have a SOC 2 report?"} />
            </div>
          ) : (
            <div>
              <label className="label">Questionnaire file (.xlsx or .csv)</label>
              <input type="file" name="file" accept=".xlsx,.xls,.csv" className="input py-1.5" />
              <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-faint">
                <FileSpreadsheet size={13} /> We read the “question” column (or the first column) — one question per row.
              </p>
            </div>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : null} Create &amp; draft answers
          </button>
        </div>
      </form>
    </div>
  );
}
