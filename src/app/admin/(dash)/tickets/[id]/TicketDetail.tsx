"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, User as UserIcon, Trash2, Pencil, Check, X, Send, Lock, MessageSquare, Activity } from "lucide-react";
import { Pill } from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { updateTicket, addComment, deleteTicket } from "../ticket-actions";

export type Comment = {
  id: string;
  authorEmail: string | null;
  body: string;
  isInternal: boolean;
  system: boolean;
  createdAt: string;
};
export type TicketFull = {
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
};
export type Assignee = { id: string; email: string };

const STATUS_TONE: Record<string, "amber" | "blue" | "emerald"> = { open: "amber", "in-progress": "blue", resolved: "emerald" };
const PRIORITY_TONE: Record<string, "slate" | "blue" | "amber" | "red"> = { low: "slate", normal: "blue", high: "amber", urgent: "red" };

export function TicketDetail({ ticket, comments, assignees }: { ticket: TicketFull; comments: Comment[]; assignees: Assignee[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editingSubject, setEditingSubject] = useState(false);
  const [subject, setSubject] = useState(ticket.subject);
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function patch(fields: Parameters<typeof updateTicket>[1], after?: () => void) {
    setError(null);
    start(async () => {
      const res = await updateTicket(ticket.id, fields);
      if (!res.ok) setError(res.error);
      else {
        after?.();
        router.refresh();
      }
    });
  }

  function postComment() {
    if (!body.trim()) return;
    setError(null);
    start(async () => {
      const res = await addComment(ticket.id, body, internal);
      if (!res.ok) setError(res.error);
      else {
        setBody("");
        router.refresh();
      }
    });
  }

  function remove() {
    if (!confirm("Delete this ticket and its history? This cannot be undone.")) return;
    start(async () => {
      const res = await deleteTicket(ticket.id);
      if (res.ok) router.push("/admin/tickets");
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/tickets" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-brand-700">
        <ArrowLeft size={15} /> All tickets
      </Link>

      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {editingSubject ? (
              <div className="flex items-center gap-2">
                <input className="input" value={subject} autoFocus onChange={(e) => setSubject(e.target.value)} />
                <button className="btn-ghost p-1.5 text-emerald-600" onClick={() => patch({ subject }, () => setEditingSubject(false))}><Check size={16} /></button>
                <button className="btn-ghost p-1.5" onClick={() => { setSubject(ticket.subject); setEditingSubject(false); }}><X size={16} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-ink">{ticket.subject}</h1>
                <button className="btn-ghost p-1 text-ink-faint" onClick={() => setEditingSubject(true)} aria-label="Edit subject"><Pencil size={14} /></button>
              </div>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs text-ink-faint">
              {ticket.source === "assistant" ? <><Bot size={13} className="text-brand-600" /> AI assistant</> : <><UserIcon size={13} /> Manual</>}
              <span>·</span>
              <span>{new Date(ticket.createdAt).toLocaleString()}</span>
            </div>
          </div>
          <button className="btn-ghost p-1.5 text-red-600 hover:bg-red-50" onClick={remove} disabled={pending} aria-label="Delete ticket"><Trash2 size={15} /></button>
        </div>

        {/* Controls */}
        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
          <label className="block">
            <span className="label">Status</span>
            <select className="input" value={ticket.status} onChange={(e) => patch({ status: e.target.value })} disabled={pending}>
              <option value="open">Open</option>
              <option value="in-progress">In progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>
          <label className="block">
            <span className="label">Priority</span>
            <select className="input" value={ticket.priority} onChange={(e) => patch({ priority: e.target.value })} disabled={pending}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="block">
            <span className="label">Assignee</span>
            <select className="input" value={ticket.assignedToId ?? ""} onChange={(e) => patch({ assignedToId: e.target.value || null })} disabled={pending}>
              <option value="">Unassigned</option>
              {assignees.map((a) => (<option key={a.id} value={a.id}>{a.email}</option>))}
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Pill tone={STATUS_TONE[ticket.status] ?? "slate"}>{ticket.status}</Pill>
          <Pill tone={PRIORITY_TONE[ticket.priority] ?? "slate"}>{ticket.priority} priority</Pill>
          {ticket.matchedCustomerName ? <Pill tone="emerald">Customer · {ticket.matchedCustomerName}</Pill> : ticket.emailDomain ? <Pill tone="slate">Lead · {ticket.emailDomain}</Pill> : null}
        </div>

        {/* Requester + question */}
        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <div className="text-xs font-medium text-ink-faint">
            {ticket.requesterName ?? "Anonymous"}{ticket.requesterEmail && <> · {ticket.requesterEmail}</>}
          </div>
          <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">{ticket.question}</p>
        </div>
      </div>

      {/* Activity + comments */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-ink">Activity</h2>
        <div className="space-y-2">
          {comments.length === 0 && <p className="text-sm text-ink-faint">No activity yet. Add an internal note below.</p>}
          {comments.map((c) =>
            c.system ? (
              <div key={c.id} className="flex items-center gap-2 px-1 text-xs text-ink-faint">
                <Activity size={12} />
                <span><span className="font-medium text-ink-soft">{c.authorEmail ?? "system"}</span> {c.body}</span>
                <span>· {new Date(c.createdAt).toLocaleString()}</span>
              </div>
            ) : (
              <div key={c.id} className={cn("card p-3.5", c.isInternal ? "bg-amber-50/50 ring-amber-100" : "")}>
                <div className="mb-1 flex items-center gap-2 text-xs text-ink-faint">
                  <span className="font-medium text-ink-soft">{c.authorEmail ?? "staff"}</span>
                  {c.isInternal ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700"><Lock size={9} /> Internal note</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700"><MessageSquare size={9} /> Reply</span>
                  )}
                  <span>· {new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-ink">{c.body}</p>
              </div>
            ),
          )}
        </div>

        {/* Composer */}
        <div className="mt-4 card p-4">
          <textarea
            className="input min-h-24"
            placeholder="Add an internal note or a reply…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400" />
              Internal note (staff only)
            </label>
            <button className="btn-primary" onClick={postComment} disabled={pending || !body.trim()}>
              <Send size={15} /> Post
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
