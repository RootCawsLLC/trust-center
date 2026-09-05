import Link from "next/link";
import { requireModuleView } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { PageHeader, Pill } from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/FilterBar";
import { SavedViews } from "@/components/admin/SavedViews";
import { SortHeader } from "@/components/admin/SortHeader";
import { getSession } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { isFreemail } from "@/lib/salesforce";
import { dateRangeWhere, firstStr, orderByFromParams } from "@/lib/filters";

const LEAD_SORTS = ["emailDomain", "sampleOrgName", "sampleCountry", "requestCount", "firstSeenAt", "lastSeenAt"] as const;
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function LeadsPage({ searchParams }: { searchParams: SP }) {
  await requireModuleView("leads");
  const sp = await searchParams;
  const q = firstStr(sp.q)?.trim();
  const from = firstStr(sp.from);
  const to = firstStr(sp.to);

  const where: Prisma.SalesLeadWhereInput = {};
  if (q) {
    where.OR = [
      { emailDomain: { contains: q, mode: "insensitive" } },
      { sampleOrgName: { contains: q, mode: "insensitive" } },
      { sampleCountry: { contains: q, mode: "insensitive" } },
    ];
  }
  const lastSeenAt = dateRangeWhere(from, to);
  if (lastSeenAt) where.lastSeenAt = lastSeenAt;

  const leads = await prisma.salesLead.findMany({
    where,
    orderBy: orderByFromParams(firstStr(sp.sort), firstStr(sp.dir), LEAD_SORTS, { requestCount: "desc" }),
  });

  const session = await getSession();
  const savedViews = session?.user?.id
    ? await prisma.savedView.findMany({
        where: { userId: session.user.id, path: "/admin/leads" },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, query: true },
      })
    : [];

  return (
    <div>
      <PageHeader
        title="Sales leads"
        description="Email domains that requested documents but are not matched to a Salesforce customer. Click a domain for the full record."
      />
      <SavedViews views={savedViews} />
      <FilterBar searchPlaceholder="Search domain, org, country…" showDateRange />

      {leads.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">
          No leads match these filters.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-2.5 font-medium"><SortHeader label="Domain" sortKey="emailDomain" /></th>
                <th className="px-4 py-2.5 font-medium"><SortHeader label="Sample org" sortKey="sampleOrgName" /></th>
                <th className="px-4 py-2.5 font-medium"><SortHeader label="Country" sortKey="sampleCountry" /></th>
                <th className="px-4 py-2.5 font-medium"><SortHeader label="Requests" sortKey="requestCount" /></th>
                <th className="px-4 py-2.5 font-medium"><SortHeader label="First seen" sortKey="firstSeenAt" /></th>
                <th className="px-4 py-2.5 font-medium"><SortHeader label="Last seen" sortKey="lastSeenAt" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/companies/${encodeURIComponent(l.emailDomain)}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {l.emailDomain}
                    </Link>
                    {isFreemail(l.emailDomain) && (
                      <span className="ml-2">
                        <Pill tone="slate">personal email</Pill>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{l.sampleOrgName ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{l.sampleCountry ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-ink">{l.requestCount}</td>
                  <td className="px-4 py-3 text-xs text-ink-faint">{formatDate(l.firstSeenAt)}</td>
                  <td className="px-4 py-3 text-xs text-ink-faint">{formatDate(l.lastSeenAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
