import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, StatCard, ClassBadge } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    totalRequests,
    customerRequests,
    leadRequests,
    ndaAcceptances,
    documents,
    leads,
    recent,
  ] = await Promise.all([
    prisma.downloadRequest.count(),
    prisma.downloadRequest.count({ where: { classification: "CUSTOMER" } }),
    prisma.downloadRequest.count({ where: { classification: "LEAD" } }),
    prisma.ndaAcceptance.count(),
    prisma.document.count(),
    prisma.salesLead.count(),
    prisma.downloadRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Activity across your Trust Center."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total requests" value={totalRequests} />
        <StatCard
          label="Customer requests"
          value={customerRequests}
          hint="Matched to Salesforce"
        />
        <StatCard label="Sales leads" value={leads} hint="Unique lead domains" />
        <StatCard label="NDAs accepted" value={ndaAcceptances} />
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink">Recent requests</h2>
          <Link href="/admin/requests" className="text-sm text-brand-600 hover:underline">
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="card p-8 text-center text-sm text-ink-faint">
            No requests yet. Downloads from the public site will appear here.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-faint">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Requester</th>
                  <th className="px-4 py-2.5 font-medium">Document</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink">{r.requesterName}</div>
                      <div className="text-xs text-ink-faint">{r.requesterEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{r.documentTitle}</td>
                    <td className="px-4 py-3">
                      <ClassBadge value={r.classification} />
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-faint">
                      {formatDate(r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
