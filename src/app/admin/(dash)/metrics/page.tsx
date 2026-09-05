import { requireModuleView } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard } from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/FilterBar";
import { dateRangeWhere, firstStr } from "@/lib/filters";
import { DATASETS, CHART_TYPES, datasetDef, runChart } from "@/lib/metrics";
import { QueryBuilder } from "./QueryBuilder";
import { SavedChartCard } from "./SavedChartCard";
import { DashboardBar, type DashTab } from "./DashboardBar";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

function qs(base: Record<string, string>, from?: string, to?: string) {
  const p = new URLSearchParams(base);
  if (from) p.set("from", from);
  if (to) p.set("to", to);
  return p.toString();
}

export default async function MetricsPage({ searchParams }: { searchParams: SP }) {
  await requireModuleView("metrics");
  const sp = await searchParams;
  const from = firstStr(sp.from);
  const to = firstStr(sp.to);
  const createdAt = dateRangeWhere(from, to);
  const reqWhere: Prisma.DownloadRequestWhereInput = createdAt ? { createdAt } : {};
  const dateWhere = createdAt ? { createdAt } : {};

  const [customers, leads, ndas, zips, total, dashboards] = await Promise.all([
    prisma.downloadRequest.count({ where: { ...reqWhere, classification: "CUSTOMER" } }),
    prisma.downloadRequest.count({ where: { ...reqWhere, classification: "LEAD" } }),
    prisma.ndaAcceptance.count({ where: dateWhere }),
    prisma.bulkDownload.count({ where: createdAt ? { createdAt } : {} }),
    prisma.downloadRequest.count({ where: reqWhere }),
    prisma.dashboard.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);

  const tabs: DashTab[] = dashboards.map((d) => ({ id: d.id, name: d.name }));
  const requested = firstStr(sp.dash);
  const selected = dashboards.find((d) => d.id === requested) ?? dashboards.find((d) => d.isDefault) ?? dashboards[0] ?? null;

  const charts = selected
    ? await prisma.savedChart.findMany({ where: { dashboardId: selected.id }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] })
    : [];
  const chartData = await Promise.all(
    charts.map(async (c) => {
      const f = (c.filters as { from?: string | null; to?: string | null } | null) ?? {};
      const rows = await runChart(c.dataset, c.dimension, { from: f.from ?? undefined, to: f.to ?? undefined });
      const ds = datasetDef(c.dataset);
      const dimLabel = ds?.dimensions.find((d) => d.key === c.dimension)?.label ?? c.dimension;
      return { id: c.id, name: c.name, subtitle: `${ds?.label ?? c.dataset} · by ${dimLabel.toLowerCase()}`, chartType: c.chartType, rows };
    }),
  );

  return (
    <div>
      <PageHeader
        title="Metrics"
        description="Request and demand analytics. Build your own charts and organize them into dashboard views to share with leadership."
      />

      <FilterBar searchPlaceholder="" showDateRange />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total requests" value={total} href={`/admin/requests?${qs({}, from, to)}`} />
        <StatCard label="Customers" value={customers} href={`/admin/requests?${qs({ type: "CUSTOMER" }, from, to)}`} />
        <StatCard label="Leads" value={leads} href={`/admin/requests?${qs({ type: "LEAD" }, from, to)}`} />
        <StatCard label="NDAs signed" value={ndas} href={`/admin/requests?${qs({ nda: "accepted" }, from, to)}`} />
        <StatCard label="Bulk ZIPs" value={zips} />
      </div>

      {/* Dashboard views */}
      <div className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 flex-1">
            <DashboardBar dashboards={tabs} selectedId={selected?.id ?? ""} />
          </div>
          {selected && (
            <QueryBuilder
              datasets={DATASETS as unknown as { key: string; label: string; dimensions: { key: string; label: string }[] }[]}
              chartTypes={CHART_TYPES as unknown as { key: string; label: string }[]}
              dashboardId={selected.id}
              dashboardName={selected.name}
            />
          )}
        </div>

        {!selected ? (
          <div className="card p-8 text-center text-sm text-ink-faint">Create your first dashboard view to start building charts.</div>
        ) : chartData.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-faint">
            No charts in the “{selected.name}” view yet. Click <span className="font-medium text-ink">New chart</span> to add one.
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {chartData.map((c) => (
              <SavedChartCard key={c.id} id={c.id} name={c.name} subtitle={c.subtitle} chartType={c.chartType} rows={c.rows} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
