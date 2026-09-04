import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, ClassBadge, Pill } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";
import { Lock, ShieldCheck } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const where: Prisma.DownloadRequestWhereInput = {};
  if (type === "CUSTOMER" || type === "LEAD") where.classification = type;

  const requests = await prisma.downloadRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { ndaAcceptance: true },
    take: 500,
  });

  const filters = [
    { key: undefined, label: "All" },
    { key: "CUSTOMER", label: "Customers" },
    { key: "LEAD", label: "Leads" },
  ];

  return (
    <div>
      <PageHeader
        title="Requests"
        description="Every document request, captured to an append-only ledger."
      />

      <div className="mb-4 flex items-center gap-4">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {filters.map((f) => {
            const active = (f.key ?? undefined) === (type ?? undefined);
            return (
              <Link
                key={f.label}
                href={f.key ? `/admin/requests?type=${f.key}` : "/admin/requests"}
                className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                  active ? "bg-white text-ink shadow-sm" : "text-ink-faint hover:text-ink"
                }`}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
          <ShieldCheck size={13} className="text-emerald-600" /> Immutable —
          records cannot be edited or deleted
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">
          No requests match this filter.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-2.5 font-medium">Requester</th>
                <th className="px-4 py-2.5 font-medium">Organization</th>
                <th className="px-4 py-2.5 font-medium">Document</th>
                <th className="px-4 py-2.5 font-medium">Type</th>
                <th className="px-4 py-2.5 font-medium">NDA</th>
                <th className="px-4 py-2.5 font-medium">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{r.requesterName}</div>
                    <div className="text-xs text-ink-faint">{r.requesterEmail}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-ink-soft">{r.orgName}</div>
                    <div className="text-xs text-ink-faint">
                      {r.emailDomain} · {r.country}
                    </div>
                    {r.matchedCustomerName && (
                      <div className="mt-1 text-xs text-emerald-700">
                        ↳ {r.matchedCustomerName}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {r.documentTitle}
                    {r.documentVisibility === "PRIVATE" && (
                      <Lock size={11} className="ml-1 inline text-amber-600" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <ClassBadge value={r.classification} />
                  </td>
                  <td className="px-4 py-3">
                    {r.ndaRequired ? (
                      r.ndaAcceptance ? (
                        <Pill tone="emerald">Accepted</Pill>
                      ) : (
                        <Pill tone="amber">Pending</Pill>
                      )
                    ) : (
                      <span className="text-xs text-ink-faint">—</span>
                    )}
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
  );
}
