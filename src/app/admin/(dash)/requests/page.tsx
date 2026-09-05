import Link from "next/link";
import { requireModuleView } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, ClassBadge, Pill } from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/FilterBar";
import { SavedViews } from "@/components/admin/SavedViews";
import { SortHeader } from "@/components/admin/SortHeader";
import { RequestArchiveBar } from "@/components/admin/RequestArchiveBar";
import { getSession } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { dateRangeWhere, firstStr, orderByFromParams } from "@/lib/filters";

const REQ_SORTS = ["createdAt", "requesterName", "requesterEmail", "orgName", "emailDomain", "documentTitle", "classification"] as const;
import { Lock, ShieldCheck } from "lucide-react";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function RequestsPage({ searchParams }: { searchParams: SP }) {
  await requireModuleView("requests");
  const sp = await searchParams;
  const q = firstStr(sp.q)?.trim();
  const type = firstStr(sp.type);
  const nda = firstStr(sp.nda);
  const from = firstStr(sp.from);
  const to = firstStr(sp.to);

  const where: Prisma.DownloadRequestWhereInput = {};
  if (type === "CUSTOMER" || type === "LEAD") where.classification = type;
  if (q) {
    where.OR = [
      { requesterName: { contains: q, mode: "insensitive" } },
      { requesterEmail: { contains: q, mode: "insensitive" } },
      { orgName: { contains: q, mode: "insensitive" } },
      { emailDomain: { contains: q, mode: "insensitive" } },
      { documentTitle: { contains: q, mode: "insensitive" } },
    ];
  }
  if (nda === "accepted") {
    where.ndaRequired = true;
    where.ndaAcceptance = { isNot: null };
  } else if (nda === "pending") {
    where.ndaRequired = true;
    where.ndaAcceptance = { is: null };
  } else if (nda === "none") {
    where.ndaRequired = false;
  }
  const createdAt = dateRangeWhere(from, to);
  if (createdAt) where.createdAt = createdAt;

  // Archive: hide archived requests by default (active view). The immutable rows
  // are untouched — RequestArchive just marks which to hide.
  const view = firstStr(sp.view) || "active";
  const archivedRows = await prisma.requestArchive.findMany({ select: { downloadRequestId: true } });
  const archivedIds = archivedRows.map((a) => a.downloadRequestId);
  if (view === "active" && archivedIds.length) where.id = { notIn: archivedIds };
  else if (view === "archived") where.id = { in: archivedIds.length ? archivedIds : ["__none__"] };

  const requests = await prisma.downloadRequest.findMany({
    where,
    orderBy: orderByFromParams(firstStr(sp.sort), firstStr(sp.dir), REQ_SORTS, { createdAt: "desc" }),
    include: { ndaAcceptance: true },
    take: 500,
  });

  const session = await getSession();
  const savedViews = session?.user?.id
    ? await prisma.savedView.findMany({
        where: { userId: session.user.id, path: "/admin/requests" },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, query: true },
      })
    : [];

  return (
    <div>
      <PageHeader
        title="Requests"
        description="Every document request, captured to an append-only ledger."
      />

      <SavedViews views={savedViews} />
      <RequestArchiveBar view={view} ids={requests.map((r) => r.id)} />

      <FilterBar
        searchPlaceholder="Search name, email, org, domain, document…"
        showDateRange
        selects={[
          {
            key: "type",
            label: "Type",
            options: [
              { value: "CUSTOMER", label: "Customers" },
              { value: "LEAD", label: "Leads" },
            ],
          },
          {
            key: "nda",
            label: "NDA",
            options: [
              { value: "accepted", label: "Accepted" },
              { value: "pending", label: "Pending" },
              { value: "none", label: "Not required" },
            ],
          },
        ]}
      />

      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-ink-faint">{requests.length} request(s)</span>
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
          <ShieldCheck size={13} className="text-emerald-600" /> Immutable — cannot
          be edited or deleted
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">
          No requests match these filters.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-2.5 font-medium"><SortHeader label="Requester" sortKey="requesterName" /></th>
                <th className="px-4 py-2.5 font-medium"><SortHeader label="Organization" sortKey="orgName" /></th>
                <th className="px-4 py-2.5 font-medium"><SortHeader label="Document" sortKey="documentTitle" /></th>
                <th className="px-4 py-2.5 font-medium"><SortHeader label="Type" sortKey="classification" /></th>
                <th className="px-4 py-2.5 font-medium">NDA</th>
                <th className="px-4 py-2.5 font-medium"><SortHeader label="When" sortKey="createdAt" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/people/${encodeURIComponent(r.requesterEmail)}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {r.requesterName}
                    </Link>
                    <div className="text-xs text-ink-faint">{r.requesterEmail}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-ink-soft">{r.orgName}</div>
                    <Link
                      href={`/admin/companies/${encodeURIComponent(r.emailDomain)}`}
                      className="text-xs text-brand-700 hover:underline"
                    >
                      {r.emailDomain}
                    </Link>
                    <span className="text-xs text-ink-faint"> · {r.country}</span>
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
