import { prisma } from "@/lib/prisma";
import { requireModuleView } from "@/lib/permissions";
import { PageHeader, StatCard, Pill } from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/FilterBar";
import { dateRangeWhere, firstStr } from "@/lib/filters";
import { getOrgSettings } from "@/lib/settings";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function DownloadsPage({ searchParams }: { searchParams: SP }) {
  await requireModuleView("downloads");
  const sp = await searchParams;
  const q = firstStr(sp.q)?.trim();
  const createdAt = dateRangeWhere(firstStr(sp.from), firstStr(sp.to));
  const where: Prisma.DownloadEventWhereInput = {};
  if (createdAt) where.createdAt = createdAt;
  if (q) {
    where.OR = [
      { requesterEmail: { contains: q, mode: "insensitive" } },
      { documentTitle: { contains: q, mode: "insensitive" } },
      { emailDomain: { contains: q, mode: "insensitive" } },
    ];
  }

  const [events, total, watermarked, settings] = await Promise.all([
    prisma.downloadEvent.findMany({ where, orderBy: { createdAt: "desc" }, take: 500 }),
    prisma.downloadEvent.count({ where }),
    prisma.downloadEvent.count({ where: { ...where, watermarked: true } }),
    getOrgSettings(),
  ]);

  return (
    <div>
      <PageHeader
        title="Download trail"
        description="Auditor-ready record of who downloaded which document, when, and from where. Confidential PDFs are watermarked per viewer."
      />

      <div className={`mb-5 rounded-lg px-4 py-3 text-sm ring-1 ring-inset ${settings.watermarkEnabled ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-slate-50 text-ink-soft ring-slate-200"}`}>
        Per-viewer watermarking is <strong>{settings.watermarkEnabled ? "on" : "off"}</strong> for confidential PDF downloads. Change it in Settings.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Downloads" value={total} />
        <StatCard label="Watermarked" value={watermarked} />
      </div>

      <div className="mt-6">
        <FilterBar searchPlaceholder="Search email, document, domain…" showDateRange />
      </div>

      {events.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">No downloads recorded in this period.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">Viewer</th>
                <th className="px-4 py-2.5 font-medium">Document</th>
                <th className="px-4 py-2.5 font-medium">IP</th>
                <th className="px-4 py-2.5 font-medium">Watermark</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((e) => (
                <tr key={e.id}>
                  <td className="px-4 py-3 text-ink-faint">{e.createdAt.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{e.requesterEmail}</div>
                    {e.emailDomain && <div className="text-xs text-ink-faint">{e.emailDomain}</div>}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{e.documentTitle}</td>
                  <td className="px-4 py-3 text-ink-faint">{e.ipAddress ?? "—"}</td>
                  <td className="px-4 py-3">
                    {e.watermarked ? <Pill tone="emerald">Watermarked</Pill> : <Pill tone="slate">—</Pill>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
