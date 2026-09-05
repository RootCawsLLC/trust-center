"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Bot, User as UserIcon, MessageSquare, Plus, X, Loader2, ArrowRight } from "lucide-react";
import { Pill } from "@/components/admin/ui";
import { updateTicket, deleteTicket, createTicket } from "./ticket-actions";
import { cn } from "@/lib/utils";

export type AdminTicket = {
  id: string;
  subject: string;
  question: string;
  requesterName: string | null;
  requesterEmail: string | null;
  emailDomain: string | null;
  matchedCustomerName: string | null;
  status: string;
  priority: string;
  source: string;
  assignedToId: string | null;
  createdAt: string;
  commentCount: number;
};
export type Assignee = { id: string; email: string };

const STATUS_TONE: Record<string, "amber" | "blue" | "emerald"> = { open: "amber", "in-progress": "blue", resolved: "emerald" };
const PRIORITY_TONE: Record<string, "slate" | "blue" | "amber" | "red"> = { low: "slate", normal: "blue", high: "amber", urgent: "red" };

export function TicketManager({ tickets, assignees }: { tickets: AdminTicket[]; assignees: Assignee[] }) {
  const [pending, start] = useTransition();
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  function patch(id: string, fields: Parameters<typeof updateTicket>[1]) {
    start(async () => {
      await updateTicket(id, fields);
      router.refresh();
    });
  }
  function remove(id: string) {
    if (!confirm("Delete this ticket?")) return;
    start(async () => {
      await deleteTicket(id);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus size={16} /> New ticket
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">No tickets yet. Questions the assistant can&rsquo;t answer land here, or add one manually.</div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className={cn("card p-4", t.status === "resolved" && "opacity-70")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {t.source === "assistant" ? <Bot size={15} className="text-brand-600" /> : <UserIcon size={15} className="text-ink-faint" />}
                    <Link href={`/admin/tickets/${t.id}`} className="font-medium text-ink hover:text-brand-700">{t.subject}</Link>
                    <Pill tone={STATUS_TONE[t.status] ?? "slate"}>{t.status}</Pill>
                    <Pill tone={PRIORITY_TONE[t.priority] ?? "slate"}>{t.priority}</Pill>
                    {t.matchedCustomerName && <Pill tone="emerald">{t.matchedCustomerName}</Pill>}
                    {t.commentCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-ink-faint"><MessageSquare size={12} /> {t.commentCount}</span>
                    )}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">{t.question}</p>
                  <div className="mt-1.5 text-xs text-ink-faint">
                    {t.requesterName ?? "Anonymous"}
                    {t.requesterEmail && <> · {t.requesterEmail}</>}
                    {" · "}
                    {new Date(t.createdAt).toLocaleString()}
                  </div>
                </div>
                <button className="btn-ghost p-1.5 text-red-600 hover:bg-red-50" onClick={() => remove(t.id)} disabled={pending} aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <select className="input w-auto text-sm" value={t.status} onChange={(e) => patch(t.id, { status: e.target.value })} disabled={pending}>
                  <option value="open">Open</option>
                  <option value="in-progress">In progress</option>
                  <option value="resolved">Resolved</option>
                </select>
                <select className="input w-auto text-sm" value={t.priority} onChange={(e) => patch(t.id, { priority: e.target.value })} disabled={pending}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <select className="input w-auto text-sm" value={t.assignedToId ?? ""} onChange={(e) => patch(t.id, { assignedToId: e.target.value || null })} disabled={pending}>
                  <option value="">Unassigned</option>
                  {assignees.map((a) => (<option key={a.id} value={a.id}>{a.email}</option>))}
                </select>
                <Link href={`/admin/tickets/${t.id}`} className="btn-ghost ml-auto text-sm text-brand-700">
                  Open <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && <NewTicketModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); router.refresh(); }} />}
    </div>
  );
}

function NewTicketModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [email, setEmail] = useState("");
  const [priority, setPriority] = useState("normal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await createTicket({ subject, question, requesterEmail: email, priority });
    setLoading(false);
    if (!res.ok) setError(res.error);
    else onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lift">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">New ticket</h2>
          <button type="button" onClick={onClose} className="btn-ghost p-1.5"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">Subject</label>
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div>
            <label className="label">Details</label>
            <textarea className="input min-h-28" value={question} onChange={(e) => setQuestion(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Requester email (optional)</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" />
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={16} /> : null} Create
          </button>
        </div>
      </form>
    </div>
  );
}
