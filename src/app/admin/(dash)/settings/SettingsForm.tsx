"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { saveSettings } from "./settings-actions";
import type { ResolvedSettings } from "@/lib/settings";

export function SettingsForm({ settings }: { settings: ResolvedSettings }) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    setError(null);
    const res = await saveSettings(new FormData(e.currentTarget));
    setLoading(false);
    if (!res.ok) setError(res.error);
    else {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="card p-6">
        <h2 className="text-base font-semibold text-ink">Branding</h2>
        <p className="mt-1 text-sm text-ink-soft">Shown on the public trust center.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Company name">
            <input name="companyName" className="input" defaultValue={settings.companyName} />
          </Field>
          <Field label="Support email">
            <input name="supportEmail" type="email" className="input" defaultValue={settings.supportEmail ?? ""} placeholder="trust@company.com" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="System status page URL">
              <input name="statusPageUrl" type="url" className="input" defaultValue={settings.statusPageUrl ?? ""} placeholder="https://status.company.com" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Tagline (hero heading)">
              <input name="tagline" className="input" defaultValue={settings.tagline} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Overview">
              <textarea name="overview" className="input min-h-24" defaultValue={settings.overview} />
            </Field>
          </div>
          <Field label="Accent color">
            <div className="flex items-center gap-2">
              <input
                name="primaryColor"
                className="input"
                defaultValue={settings.primaryColor ?? ""}
                placeholder="#4f46e5"
              />
            </div>
          </Field>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold text-ink">Public sections</h2>
        <p className="mt-1 text-sm text-ink-soft">Choose which tabs appear on the public trust center.</p>
        <div className="mt-4 space-y-2">
          <Toggle name="showSubprocessors" label="Subprocessors" defaultChecked={settings.showSubprocessors} />
          <Toggle name="showKnowledge" label="FAQ" defaultChecked={settings.showKnowledge} />
          <Toggle name="showUpdates" label="Updates" defaultChecked={settings.showUpdates} />
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-base font-semibold text-ink">Requests</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Download link lifetime (minutes)">
            <input name="grantTtlMinutes" type="number" min={1} max={1440} className="input" defaultValue={settings.grantTtlMinutes} />
          </Field>
          <Field label="Confidential-document access">
            <select name="approvalMode" className="input" defaultValue={settings.approvalMode}>
              <option value="auto">Automatic — grant instantly after NDA</option>
              <option value="manual">Manual — require admin approval</option>
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink-soft sm:col-span-2">
            <input type="checkbox" name="watermarkEnabled" defaultChecked={settings.watermarkEnabled} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400" />
            Watermark confidential PDF downloads with the viewer&rsquo;s email and timestamp
          </label>
          <div className="sm:col-span-2">
            <Field label="Data-handling note (shown to requesters)">
              <textarea name="retentionNote" className="input min-h-20" defaultValue={settings.retentionNote ?? ""} placeholder="e.g. We retain request records to manage access to our documentation." />
            </Field>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={16} /> : null}
          Save settings
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
            <Check size={15} /> Saved
          </span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-ink">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400" />
      {label}
    </label>
  );
}
