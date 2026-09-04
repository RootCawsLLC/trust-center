import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="card p-5">
      <div className="text-sm text-ink-faint">{label}</div>
      <div className="mt-1 text-3xl font-bold text-ink">{value}</div>
      {hint && <div className="mt-1 text-xs text-ink-faint">{hint}</div>}
    </div>
  );
}

export function ClassBadge({ value }: { value: "CUSTOMER" | "LEAD" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        value === "CUSTOMER"
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-blue-50 text-blue-700 ring-blue-200",
      )}
    >
      {value === "CUSTOMER" ? "Customer" : "Lead"}
    </span>
  );
}

export function Pill({
  children,
  tone = "slate",
}: {
  children: React.ReactNode;
  tone?: "slate" | "amber" | "emerald" | "red";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    red: "bg-red-50 text-red-700 ring-red-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="card p-10 text-center text-sm text-ink-faint">{children}</div>
  );
}
