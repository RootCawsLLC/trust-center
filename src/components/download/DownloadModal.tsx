"use client";

import { useState } from "react";
import { X, ShieldCheck, Lock, FileText, CheckCircle2, Loader2, Clock, Ban } from "lucide-react";
import { COUNTRIES } from "@/lib/constants";

export type PublicDoc = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  visibility: "PUBLIC" | "PRIVATE";
  fileName: string;
};

type Phase = "form" | "nda" | "done" | "pending" | "denied";
type FieldErrors = Record<string, string[] | undefined>;

export function DownloadModal({
  doc,
  onClose,
}: {
  doc: PublicDoc | null;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("form");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    requesterName: "",
    requesterEmail: "",
    orgName: "",
    country: "",
  });
  const [requestId, setRequestId] = useState<string | null>(null);
  const [nda, setNda] = useState<{ name: string; bodyMarkdown: string; contentHtml?: string | null } | null>(null);
  const [signerName, setSignerName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [downloadToken, setDownloadToken] = useState<string | null>(null);

  if (!doc) return null;

  const isPrivate = doc.visibility === "PRIVATE";

  function reset() {
    setPhase("form");
    setLoading(false);
    setErrors({});
    setFormError(null);
    setForm({ requesterName: "", requesterEmail: "", orgName: "", country: "" });
    setRequestId(null);
    setNda(null);
    setSignerName("");
    setAgreed(false);
    setDownloadToken(null);
  }

  function close() {
    reset();
    onClose();
  }

  function startDownload(token: string) {
    setDownloadToken(token);
    setPhase("done");
    // Trigger the browser download.
    window.location.href = `/api/download/${token}`;
  }

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setFormError(null);
    try {
      const res = await fetch("/api/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: doc!.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.issues) setErrors(data.issues);
        else setFormError("Something went wrong. Please try again.");
        return;
      }
      if (data.status === "nda") {
        setRequestId(data.requestId);
        setNda(data.nda);
        setPhase("nda");
      } else if (data.status === "ready") {
        startDownload(data.token);
      }
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
      const res = await fetch("/api/nda-accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, signerName, agreed }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.issues) setErrors(data.issues);
        else setFormError("Could not record acceptance. Please try again.");
        return;
      }
      if (data.status === "ready") startDownload(data.token);
      else if (data.status === "pending") setPhase("pending");
      else if (data.status === "denied") setPhase("denied");
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              {isPrivate ? <Lock size={18} /> : <FileText size={18} />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink">{doc.title}</h2>
              <p className="text-xs text-ink-faint">
                {isPrivate ? "Confidential — requires NDA" : "Public document"}
              </p>
            </div>
          </div>
          <button onClick={close} className="btn-ghost -mr-2 p-1.5" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Step: form */}
        {phase === "form" && (
          <form onSubmit={submitForm} className="space-y-4 p-5">
            <div
              className={
                "flex items-center gap-2.5 rounded-lg p-3.5 text-base font-semibold ring-1 ring-inset " +
                (isPrivate
                  ? "bg-amber-50 text-amber-800 ring-amber-200"
                  : "bg-emerald-50 text-emerald-800 ring-emerald-200")
              }
            >
              {isPrivate ? (
                <Lock size={20} className="shrink-0" />
              ) : (
                <ShieldCheck size={20} className="shrink-0" />
              )}
              {isPrivate
                ? "You'll sign a quick NDA next before this confidential document is released."
                : "No NDA required — your download starts as soon as you submit."}
            </div>
            <p className="text-sm text-ink-soft">
              Tell us who you are to access this document. We use this to keep a
              record of who has our documentation.
            </p>
            <Field label="Full name" error={errors.requesterName}>
              <input
                className="input"
                value={form.requesterName}
                onChange={(e) => setForm({ ...form, requesterName: e.target.value })}
                placeholder="Jordan Rivera"
                autoFocus
              />
            </Field>
            <Field label="Work email" error={errors.requesterEmail}>
              <input
                className="input"
                type="email"
                value={form.requesterEmail}
                onChange={(e) => setForm({ ...form, requesterEmail: e.target.value })}
                placeholder="jordan@company.com"
              />
            </Field>
            <Field label="Organization" error={errors.orgName}>
              <input
                className="input"
                value={form.orgName}
                onChange={(e) => setForm({ ...form, orgName: e.target.value })}
                placeholder="Company, Inc."
              />
            </Field>
            <Field label="Country" error={errors.country}>
              <select
                className="input"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              >
                <option value="">Select a country…</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={16} /> : null}
              {isPrivate ? "Continue to NDA" : "Download"}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-ink-faint">
              <ShieldCheck size={13} /> Your details are stored securely and never
              sold.
            </p>
          </form>
        )}

        {/* Step: NDA */}
        {phase === "nda" && nda && (
          <form onSubmit={acceptNda} className="space-y-4 p-5">
            <div>
              <h3 className="text-sm font-semibold text-ink">{nda.name}</h3>
              <p className="text-xs text-ink-faint">
                Review and accept to access this confidential document.
              </p>
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
              <input
                className="input"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Jordan Rivera"
              />
            </Field>
            <label className="flex items-start gap-2.5 text-sm text-ink-soft">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <span>
                I have read and agree to the terms of this Non-Disclosure
                Agreement. I understand my acceptance is recorded with a
                timestamp and IP address.
              </span>
            </label>
            {errors.agreed && (
              <p className="text-sm text-red-600">{errors.agreed[0]}</p>
            )}
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading || !agreed}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : null}
              Accept & download
            </button>
          </form>
        )}

        {/* Step: pending approval */}
        {phase === "pending" && (
          <div className="space-y-4 p-8 text-center">
            <Clock className="mx-auto text-amber-500" size={44} />
            <div>
              <h3 className="text-base font-semibold text-ink">Request submitted for approval</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Thanks{form.requesterName ? `, ${form.requesterName.split(" ")[0]}` : ""}. Your NDA is recorded and this
                confidential document now needs approval from our team. We&apos;ll email a
                time-limited download link to <span className="font-medium text-ink">{form.requesterEmail}</span> once
                it&apos;s approved.
              </p>
            </div>
            <button onClick={close} className="btn-primary">Done</button>
          </div>
        )}

        {/* Step: denied */}
        {phase === "denied" && (
          <div className="space-y-4 p-8 text-center">
            <Ban className="mx-auto text-red-500" size={44} />
            <div>
              <h3 className="text-base font-semibold text-ink">Access not granted</h3>
              <p className="mt-1 text-sm text-ink-soft">
                We&apos;re unable to release this document to your organization automatically.
                If you believe this is a mistake, contact us and we&apos;ll take another look.
              </p>
            </div>
            <button onClick={close} className="btn-secondary">Close</button>
          </div>
        )}

        {/* Step: done */}
        {phase === "done" && (
          <div className="space-y-4 p-8 text-center">
            <CheckCircle2 className="mx-auto text-green-500" size={44} />
            <div>
              <h3 className="text-base font-semibold text-ink">
                Your download is starting
              </h3>
              <p className="mt-1 text-sm text-ink-soft">
                If it doesn&apos;t begin automatically, use the link below.
              </p>
            </div>
            {downloadToken && (
              <a href={`/api/download/${downloadToken}`} className="btn-secondary">
                <FileText size={16} /> Download {doc.fileName}
              </a>
            )}
            <div>
              <button onClick={close} className="btn-ghost text-sm">
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error[0]}</p>}
    </div>
  );
}
