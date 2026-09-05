"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Plus, Trash2, Loader2, ShieldCheck, Ban } from "lucide-react";
import { Pill } from "@/components/admin/ui";
import { approveAccess, denyAccess, saveRule, deleteRule } from "./actions";

export type PendingItem = {
  id: string;
  requesterName: string;
  requesterEmail: string;
  emailDomain: string;
  orgName: string;
  documentTitle: string;
  matchedCustomerName: string | null;
  createdAt: string;
};
export type DecidedItem = {
  id: string;
  status: string;
  requesterEmail: string;
  documentTitle: string;
  decidedByEmail: string | null;
  reason: string | null;
  decidedAt: string | null;
};
export type Rule = { id: string; domain: string; decision: string; note: string | null };

const STATUS_TONE: Record<string, "emerald" | "red" | "amber" | "slate"> = {
  approved: "emerald", "auto-approved": "emerald", denied: "red", "auto-denied": "red", pending: "amber",
};

export function AccessManager({ pending, decided, rules }: { pending: PendingItem[]; decided: DecidedItem[]; rules: Rule[] }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [denyingId, setDenyingId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Something went wrong.");
      else { after?.(); router.refresh(); }
    });
  }

  return (
    <div className="space-y-8">
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">{error}</div>}

      {/* Pending */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">Pending approval ({pending.length})</h2>
        {pending.length === 0 ? (
          <div className="card p-6 text-center text-sm text-ink-faint">No requests awaiting approval.</div>
        ) : (
          <div className="space-y-3">
            {pending.map((p) => (
              <div key={p.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{p.documentTitle}</span>
                      {p.matchedCustomerName ? <Pill tone="emerald">Customer · {p.matchedCustomerName}</Pill> : <Pill tone="slate">Lead · {p.emailDomain}</Pill>}
                    </div>
                    <div className="mt-1 text-sm text-ink-soft">{p.requesterName} · {p.requesterEmail} · {p.orgName}</div>
                    <div className="text-xs text-ink-faint">{new Date(p.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button className="btn-primary" disabled={busy} onClick={() => run(() => approveAccess(p.id))}>
                      <Check size={15} /> Approve
                    </button>
                    <button className="btn-secondary" disabled={busy} onClick={() => { setDenyingId(p.id); setDenyReason(""); }}>
                      <Ban size={15} /> Deny
                    </button>
                  </div>
                </div>
                {denyingId === p.id && (
                  <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
                    <input className="input flex-1" placeholder="Reason (optional)" value={denyReason} onChange={(e) => setDenyReason(e.target.value)} />
                    <button className="btn-secondary" onClick={() => run(() => denyAccess(p.id, denyReason), () => setDenyingId(null))} disabled={busy}>Confirm deny</button>
                    <button className="btn-ghost" onClick={() => setDenyingId(null)}>Cancel</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent decisions */}
      {decided.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">Recent decisions</h2>
          <div className="card divide-y divide-slate-100">
            {decided.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-ink">{d.documentTitle}</span>
                  <span className="ml-2 text-ink-faint">{d.requesterEmail}</span>
                  {d.reason && <span className="ml-2 text-xs text-ink-faint">— {d.reason}</span>}
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs text-ink-faint">
                  <Pill tone={STATUS_TONE[d.status] ?? "slate"}>{d.status}</Pill>
                  {d.decidedByEmail && <span>{d.decidedByEmail}</span>}
                  {d.decidedAt && <span>{new Date(d.decidedAt).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Domain rules */}
      <section>
        <h2 className="mb-1 text-sm font-semibold text-ink">Auto-approval rules</h2>
        <p className="mb-3 text-sm text-ink-faint">Requests from these domains are auto-approved or auto-denied without manual review (applies in manual approval mode).</p>
        <RuleForm onSaved={() => router.refresh()} onError={setError} />
        {rules.length > 0 && (
          <div className="card mt-3 divide-y divide-slate-100">
            {rules.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  {r.decision === "deny" ? <Ban size={15} className="text-red-500" /> : <ShieldCheck size={15} className="text-emerald-600" />}
                  <span className="font-medium text-ink">{r.domain}</span>
                  <Pill tone={r.decision === "deny" ? "red" : "emerald"}>{r.decision === "deny" ? "Auto-deny" : "Auto-approve"}</Pill>
                  {r.note && <span className="text-xs text-ink-faint">{r.note}</span>}
                </div>
                <button className="btn-ghost p-1.5 text-red-600 hover:bg-red-50" onClick={() => run(() => deleteRule(r.id))} disabled={busy}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RuleForm({ onSaved, onError }: { onSaved: () => void; onError: (e: string | null) => void }) {
  const [domain, setDomain] = useState("");
  const [decision, setDecision] = useState("approve");
  const [note, setNote] = useState("");
  const [busy, start] = useTransition();
  return (
    <form
      className="flex flex-wrap gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onError(null);
        start(async () => {
          const res = await saveRule(domain, decision, note);
          if (!res.ok) onError(res.error ?? "Could not save.");
          else { setDomain(""); setNote(""); onSaved(); }
        });
      }}
    >
      <input className="input w-48" placeholder="acme.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
      <select className="input w-auto" value={decision} onChange={(e) => setDecision(e.target.value)}>
        <option value="approve">Auto-approve</option>
        <option value="deny">Auto-deny</option>
      </select>
      <input className="input flex-1" placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button type="submit" className="btn-primary shrink-0" disabled={busy || !domain.trim()}>
        {busy ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Add rule
      </button>
    </form>
  );
}
