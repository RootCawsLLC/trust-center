import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Row = { label: string; n: number };

function tally(pairs: string[]): Row[] {
  const m = new Map<string, number>();
  for (const p of pairs) m.set(p, (m.get(p) ?? 0) + 1);
  return [...m.entries()].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
}

export default async function MetricsPage() {
  const [total, customers, leads, ndas, zips, requests, months] = await Promise.all([
    prisma.downloadRequest.count(),
    prisma.downloadRequest.count({ where: { classification: "CUSTOMER" } }),
    prisma.downloadRequest.count({ where: { classification: "LEAD" } }),
    prisma.ndaAcceptance.count(),
    prisma.bulkDownload.count(),
    prisma.downloadRequest.findMany({
      select: { documentId: true, documentTitle: true, documentVisibility: true, emailDomain: true },
    }),
    prisma.$queryRawUnsafe<{ label: string; n: number }[]>(
      `SELECT to_char(date_trunc('month', "createdAt"), 'Mon YYYY') AS label, count(*)::int AS n
       FROM "DownloadRequest"
       GROUP BY date_trunc('month', "createdAt")
       ORDER BY date_trunc('month', "createdAt") ASC`,
    ),
  ]);

  // Frameworks / industries requested (weighted by request count).
  const docIds = [...new Set(requests.map((r) => r.documentId))];
  const docs = await prisma.document.findMany({
    where: { id: { in: docIds } },
    select: { id: true, frameworks: true, industries: true },
  });
  const docMap = new Map(docs.map((d) => [d.id, d]));

  const byDoc = tally(requests.map((r) => r.documentTitle)).slice(0, 8);
  const byDomain = tally(requests.map((r) => r.emailDomain)).slice(0, 8);
  const byFramework = tally(
    requests.flatMap((r) => docMap.get(r.documentId)?.frameworks ?? []),
  ).slice(0, 8);
  const byIndustry = tally(
    requests.flatMap((r) => docMap.get(r.documentId)?.industries ?? []),
  ).slice(0, 8);
  const publicN = requests.filter((r) => r.documentVisibility === "PUBLIC").length;
  const privateN = requests.length - publicN;

  return (
    <div>
      <PageHeader
        title="Metrics"
        description="Requests, demand by document and framework, and customer-vs-lead mix — for leadership reporting."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total requests" value={total} href="/admin/requests" />
        <StatCard label="Customers" value={customers} href="/admin/requests?type=CUSTOMER" />
        <StatCard label="Leads" value={leads} href="/admin/requests?type=LEAD" />
        <StatCard label="NDAs signed" value={ndas} />
        <StatCard label="Bulk ZIPs" value={zips} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Requests over time">
          <Bars rows={months} accent="brand" />
        </Panel>
        <Panel title="Customer vs lead">
          <Bars
            rows={[
              { label: "Customers", n: customers },
              { label: "Leads", n: leads },
            ]}
            accent="split"
          />
          <div className="mt-3 text-xs text-ink-faint">
            Public downloads: {publicN} · Under NDA: {privateN}
          </div>
        </Panel>
        <Panel title="Most requested documents">
          <Bars rows={byDoc} accent="brand" />
        </Panel>
        <Panel title="Demand by framework">
          <Bars rows={byFramework} accent="emerald" />
        </Panel>
        <Panel title="Demand by industry">
          <Bars rows={byIndustry} accent="amber" />
        </Panel>
        <Panel title="Top requesting domains">
          <Bars rows={byDomain} accent="brand" />
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

function Bars({ rows, accent = "brand" }: { rows: Row[]; accent?: string }) {
  if (rows.length === 0) return <p className="text-sm text-ink-faint">No data yet.</p>;
  const max = Math.max(...rows.map((r) => r.n), 1);
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.label} className="flex items-center gap-3 text-sm">
          <div className="w-32 shrink-0 truncate text-ink-soft" title={r.label}>
            {r.label}
          </div>
          <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
            <div
              className={cn(
                "h-full rounded",
                accent === "split" ? (i === 0 ? "bg-emerald-500" : "bg-blue-500") : ACCENT[accent],
              )}
              style={{ width: `${Math.max((r.n / max) * 100, 4)}%` }}
            />
          </div>
          <div className="w-8 shrink-0 text-right font-medium text-ink">{r.n}</div>
        </div>
      ))}
    </div>
  );
}
