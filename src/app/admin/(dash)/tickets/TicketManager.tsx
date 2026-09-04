"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Bot, User as UserIcon } from "lucide-react";
import { Pill } from "@/components/admin/ui";
import { updateTicket, deleteTicket } from "./ticket-actions";
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
  source: string;
  assignedToId: string | null;
  createdAt: string;
};
export type Assignee = { id: string; email: string };

const STATUS_TONE: Record<string, "amber" | "blue" | "emerald"> = {
  open: "amber",
  "in-progress": "blue",
  resolved: "emerald",
};

export function TicketManager({ tickets, assignees }: { tickets: AdminTicket[]; assignees: Assignee[] }) {
  const [pending, start] = useTransition();
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

  if (tickets.length === 0) {
    return <div className="card p-8 text-center text-sm text-ink-faint">No tickets yet. Questions the assistant can&rsquo;t answer land here.</div>;
  }

  return (
    <div className="space-y-3">
      {tickets.map((t) => (
        <div key={t.id} className={cn("card p-5", t.status === "resolved" && "opacity-70")}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {t.source === "assistant" ? <Bot size={15} className="text-brand-600" /> : <UserIcon size={15} className="text-ink-faint" />}
                <Pill tone={STATUS_TONE[t.status] ?? "slate"}>{t.status}</Pill>
                {t.matchedCustomerName && <Pill tone="emerald">{t.matchedCustomerName}</Pill>}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{t.question}</p>
              <div className="mt-2 text-xs text-ink-faint">
                {t.requesterName ?? "Anonymous"}
                {t.requesterEmail && <> · {t.requesterEmail}</>}
                {t.emailDomain && <> · {t.emailDomain}</>}
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
            <select className="input w-auto text-sm" value={t.assignedToId ?? ""} onChange={(e) => patch(t.id, { assignedToId: e.target.value || null })} disabled={pending}>
              <option value="">Unassigned</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>{a.email}</option>
              ))}
            </select>
          </div>
        </div>
      ))}
    </div>
  );
}
