"use client";

import { useState } from "react";
import { X, Lock, Package, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { COUNTRIES } from "@/lib/constants";
import type { LibraryDoc } from "./DocumentLibrary";

type Phase = "form" | "nda" | "done";
type FieldErrors = Record<string, string[] | undefined>;

export function BulkDownloadModal({
  docs,
  label,
  onClose,
}: {
  docs: LibraryDoc[] | null;
  label: string;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("form");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ requesterName: "", requesterEmail: "", orgName: "", country: "" });
  const [batchId, setBatchId] = useState<string | null>(null);
  const [nda, setNda] = useState<{ name: string; bodyMarkdown: string; contentHtml?: string | null } | null>(null);
  const [signerName, setSignerName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  if (!docs) return null;

  const anyPrivate = docs.some((d) => d.visibility === "PRIVATE");
  const documentIds = docs.map((d) => d.id);

  function close() {
    setPhase("form");
    setLoading(false);
    setErrors({});
    setFormError(null);
    setForm({ requesterName: "", requesterEmail: "", orgName: "", country: "" });
    setBatchId(null);
    setNda(null);
    setSignerName("");
    setAgreed(false);
    setToken(null);
    onClose();
  }

  function startDownload(t: string) {
    setToken(t);
    setPhase("done");
    window.location.href = `/api/download-zip/${t}`;
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setFormError(null);
    try {
      const res = await fetch("/api/request-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.issues) setErrors(data.issues);
        else setFormError("Something went wrong. Please try again.");
        return;
      }
      if (data.status === "nda") {
        setBatchId(data.batchId);
        setNda(data.nda);
        setPhase("nda");
      } else if (data.status === "ready") startDownload(data.token);
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function acceptNda(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setFormError(null);
    try {
      const res = await fetch("/api/nda-accept-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, signerName, agreed }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.issues) setErrors(data.issues);
        else setFormError("Could not record acceptance. Please try again.");
        return;
      }
      if (data.status === "ready") startDownload(data.token);
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" onClick={close} role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-lift" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Package size={18} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">{label}</h2>
              <p className="text-xs text-ink-faint">
                {docs.length} document{docs.length === 1 ? "" : "s"} · packaged as a ZIP
              </p>
            </div>
          </div>
          <button onClick={close} className="btn-ghost -mr-2 p-1.5" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {phase === "form" && (
          <form onSubmit={submitForm} className="space-y-4 p-5">
            <div
              className={
                "flex items-center gap-2.5 rounded-lg p-3.5 text-base font-semibold ring-1 ring-inset " +
                (anyPrivate ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-emerald-50 text-emerald-800 ring-emerald-200")
              }
            >
              {anyPrivate ? <Lock size={20} className="shrink-0" /> : <ShieldCheck size={20} className="shrink-0" />}
              {anyPrivate
                ? "This selection includes confidential documents — you'll sign one NDA that covers them all."
                : "No NDA required — your ZIP download starts as soon as you submit."}
            </div>
            <Field label="Full name" error={errors.requesterName}>
              <input className="input" value={form.requesterName} onChange={(e) => setForm({ ...form, requesterName: e.target.value })} placeholder="Jordan Rivera" autoFocus />
            </Field>
            <Field label="Work email" error={errors.requesterEmail}>
              <input className="input" type="email" value={form.requesterEmail} onChange={(e) => setForm({ ...form, requesterEmail: e.target.value })} placeholder="jordan@company.com" />
            </Field>
            <Field label="Organization" error={errors.orgName}>
              <input className="input" value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} placeholder="Company, Inc." />
            </Field>
            <Field label="Country" error={errors.country}>
              <select className="input" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                <option value="">Select a country…</option>
                {COUNTRIES.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
            </Field>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : null}
              {anyPrivate ? "Continue to NDA" : "Download ZIP"}
            </button>
          </form>
        )}

        {phase === "nda" && nda && (
          <form onSubmit={acceptNda} className="space-y-4 p-5">
            <div>
              <h3 className="text-sm font-semibold text-ink">{nda.name}</h3>
              <p className="text-xs text-ink-faint">One NDA covers all confidential documents in this download.</p>
            </div>
            {nda.contentHtml ? (
              <div
                className="tc-prose max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-ink-soft"
                dangerouslySetInnerHTML={{ __html: nda.contentHtml }}
              />
            ) : (
              <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-ink-soft">
                {nda.bodyMarkdown}
              </div>
            )}
            <Field label="Type your full name to sign" error={errors.signerName}>
              <input className="input" value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Jordan Rivera" />
            </Field>
            <label className="flex items-start gap-2.5 text-sm text-ink-soft">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              <span>I have read and agree to this NDA. My acceptance is recorded with a timestamp and IP address.</span>
            </label>
            {errors.agreed && <p className="text-sm text-red-600">{errors.agreed[0]}</p>}
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading || !agreed}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : null}
              Accept &amp; download ZIP
            </button>
          </form>
        )}

        {phase === "done" && (
          <div className="space-y-4 p-8 text-center">
            <CheckCircle2 className="mx-auto text-green-500" size={44} />
            <div>
              <h3 className="text-base font-semibold text-ink">Your ZIP is downloading</h3>
              <p className="mt-1 text-sm text-ink-soft">If it doesn&apos;t begin automatically, use the link below.</p>
            </div>
            {token && (
              <a href={`/api/download-zip/${token}`} className="btn-secondary">
                <Package size={16} /> Download ZIP
              </a>
            )}
            <div>
              <button onClick={close} className="btn-ghost text-sm">Done</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string[]; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error[0]}</p>}
    </div>
  );
}
