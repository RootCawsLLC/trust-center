import { ShieldCheck } from "lucide-react";

// Polished, styled badges (not official trademarked logos). Per-framework color
// and a short mark, rendered as circular medallions like a typical trust center.
const STYLE: Record<string, { ring: string; text: string; short: string }> = {
  "SOC 2": { ring: "ring-sky-300 bg-sky-50", text: "text-sky-700", short: "SOC 2" },
  "SOC 3": { ring: "ring-sky-300 bg-sky-50", text: "text-sky-700", short: "SOC 3" },
  "ISO 27001": { ring: "ring-indigo-300 bg-indigo-50", text: "text-indigo-700", short: "ISO\n27001" },
  "ISO 27701": { ring: "ring-violet-300 bg-violet-50", text: "text-violet-700", short: "ISO\n27701" },
  "ISO 42001": { ring: "ring-fuchsia-300 bg-fuchsia-50", text: "text-fuchsia-700", short: "ISO\n42001" },
  HIPAA: { ring: "ring-rose-300 bg-rose-50", text: "text-rose-700", short: "HIPAA" },
  HITRUST: { ring: "ring-orange-300 bg-orange-50", text: "text-orange-700", short: "HITRUST" },
  "PCI DSS": { ring: "ring-amber-300 bg-amber-50", text: "text-amber-700", short: "PCI\nDSS" },
  GDPR: { ring: "ring-blue-300 bg-blue-50", text: "text-blue-700", short: "GDPR" },
  CCPA: { ring: "ring-cyan-300 bg-cyan-50", text: "text-cyan-700", short: "CCPA" },
  "NIST CSF": { ring: "ring-slate-300 bg-slate-100", text: "text-slate-700", short: "NIST" },
  FedRAMP: { ring: "ring-red-300 bg-red-50", text: "text-red-700", short: "FedRAMP" },
  "EU AI Act": { ring: "ring-emerald-300 bg-emerald-50", text: "text-emerald-700", short: "EU AI" },
};

export function CertBadge({ name }: { name: string }) {
  const s = STYLE[name] ?? {
    ring: "ring-brand-300 bg-brand-50",
    text: "text-brand-700",
    short: name.slice(0, 6),
  };
  return (
    <div className="flex w-20 flex-col items-center gap-1.5" title={name}>
      <div
        className={`flex h-16 w-16 flex-col items-center justify-center rounded-full text-center ring-2 ${s.ring}`}
      >
        <ShieldCheck size={14} className={s.text} />
        <span className={`whitespace-pre-line text-[10px] font-bold leading-tight ${s.text}`}>
          {s.short}
        </span>
      </div>
      <span className="text-center text-[11px] font-medium leading-tight text-ink">{name}</span>
    </div>
  );
}
