import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/FilterBar";
import { dateRangeWhere, firstStr } from "@/lib/filters";
import { cn } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type Row = { label: string; n: number };
type SP = Promise<Record<string, string | string[] | undefined>>;

function tally(pairs: string[]): Row[] {
  const m = new Map<string, number>();
  for (const p of pairs) m.set(p, (m.get(p) ?? 0) + 1);
  return [...m.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
}

function qs(base: Record<string, string>, from?: string, to?: string) {
  const p = new URLSearchParams(base);
  if (from) p.set("from", from);
  if (to) p.set("to", to);
  return p.toString();
}

export default async function MetricsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const from = firstStr(sp.from);
  const to = firstStr(sp.to);
  const createdAt = dateRangeWhere(from, to);
  const reqWhere: Prisma.DownloadRequestWhereInput = createdAt ? { createdAt } : {};
  const dateWhere = createdAt ? { createdAt } : {};

  const [customers, leads, ndas, zips, requests] = await Promise.all([
    prisma.downloadRequest.count({ where: { ...reqWhere, classification: "CUSTOMER" } }),
    prisma.downloadRequest.count({ where: { ...reqWhere, classification: "LEAD" } }),
    prisma.ndaAcceptance.count({ where: dateWhere }),
    prisma.bulkDownload.count({ where: createdAt ? { createdAt } : {} }),
    prisma.downloadRequest.findMany({
      where: reqWhere,
      select: { documentId: true, documentTitle: true, documentVisibility: true, emailDomain: true, createdAt: true },
    }),
  ]);
  const total = requests.length;

  const docIds = [...new Set(requests.map((r) => r.documentId))];
  const docs = await prisma.document.findMany({
    where: { id: { in: docIds } },
    select: { id: true, frameworks: true, industries: true },
  });
  const docMap = new Map(docs.map((d) => [d.id, d]));

  const months = tally(
    requests.map((r) => r.createdAt.toLocaleString("en-US", { month: "short", year: "numeric" })),
  ).reverse();
  const byDoc = tally(requests.map((r) => r.documentTitle)).slice(0, 8);
  const byDomain = tally(requests.map((r) => r.emailDomain)).slice(0, 8);
  const byFramework = tally(requests.flatMap((r) => docMap.get(r.documentId)?.frameworks ?? [])).slice(0, 8);
  const byIndustry = tally(requests.flatMap((r) => docMap.get(r.documentId)?.industries ?? [])).slice(0, 8);
  const publicN = requests.filter((r) => r.documentVisibility === "PUBLIC").length;

  return (
    <div>
      <PageHeader
        title="Metrics"
        description="Requests, demand by document and framework, and customer-vs-lead mix. Filter by date; click any bar to drill into the underlying requests."
      />

      <FilterBar searchPlaceholder="" showDateRange />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total requests" value={total} href={`/admin/requests?${qs({}, from, to)}`} />
        <StatCard label="Customers" value={customers} href={`/admin/requests?${qs({ type: "CUSTOMER" }, from, to)}`} />
        <StatCard label="Leads" value={leads} href={`/admin/requests?${qs({ type: "LEAD" }, from, to)}`} />
        <StatCard label="NDAs signed" value={ndas} href={`/admin/requests?${qs({ nda: "accepted" }, from, to)}`} />
        <StatCard label="Bulk ZIPs" value={zips} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Requests over time">
          <Bars rows={months} accent="brand" />
        </Panel>
        <Panel title="Customer vs lead">
          <Bars
            rows={[{ label: "Customers", n: customers }, { label: "Leads", n: leads }]}
            accent="split"
            hrefFor={(l) => `/admin/requests?${qs({ type: l === "Customers" ? "CUSTOMER" : "LEAD" }, from, to)}`}
          />
          <div className="mt-3 text-xs text-ink-faint">
            Public downloads: {publicN} · Under NDA: {total - publicN}
          </div>
        </Panel>
        <Panel title="Most requested documents">
          <Bars rows={byDoc} accent="brand" hrefFor={(l) => `/admin/requests?${qs({ q: l }, from, to)}`} />
        </Panel>
        <Panel title="Demand by framework">
          <Bars rows={byFramework} accent="emerald" />
        </Panel>
        <Panel title="Demand by industry">
          <Bars rows={byIndustry} accent="amber" />
        </Panel>
        <Panel title="Top requesting domains">
          <Bars rows={byDomain} accent="brand" hrefFor={(l) => `/admin/requests?${qs({ q: l }, from, to)}`} />
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="mb-4 text-sm font-semibold text-ink">{title}</h2>
      {children}
    </div>
  );
}

const ACCENT: Record<string, string> = {
  brand: "bg-brand-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
};

function Bars({ rows, accent = "brand", hrefFor }: { rows: Row[]; accent?: string; hrefFor?: (label: string) => string }) {
  if (rows.length === 0) return <p className="text-sm text-ink-faint">No data in this period.</p>;
  const max = Math.max(...rows.map((r) => r.n), 1);
  return (
    <div className="space-y-3">
      {rows.map((r, i) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            {hrefFor ? (
              <Link href={hrefFor(r.label)} className="truncate font-medium text-brand-700 hover:underline" title={r.label}>
                {r.label}
              </Link>
            ) : (
              <span className="truncate text-ink-soft" title={r.label}>{r.label}</span>
            )}
            <span className="shrink-0 font-semibold text-ink">{r.n}</span>
          </div>
          <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn("h-full rounded-full", accent === "split" ? (i === 0 ? "bg-emerald-500" : "bg-blue-500") : ACCENT[accent])}
              style={{ width: `${Math.max((r.n / max) * 100, 3)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
