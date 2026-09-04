import { prisma } from "@/lib/prisma";
import { PageHeader, Pill } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";
import { isFreemail } from "@/lib/salesforce";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const leads = await prisma.salesLead.findMany({
    orderBy: [{ requestCount: "desc" }, { lastSeenAt: "desc" }],
  });

  return (
    <div>
      <PageHeader
        title="Sales leads"
        description="Email domains that requested documents but are not matched to a Salesforce customer."
      />

      {leads.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">
          No leads yet. Non-customer requesters are captured here by domain.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-2.5 font-medium">Domain</th>
                <th className="px-4 py-2.5 font-medium">Sample org</th>
                <th className="px-4 py-2.5 font-medium">Country</th>
                <th className="px-4 py-2.5 font-medium">Requests</th>
                <th className="px-4 py-2.5 font-medium">First seen</th>
                <th className="px-4 py-2.5 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3">
                    <span className="font-medium text-ink">{l.emailDomain}</span>
                    {isFreemail(l.emailDomain) && (
                      <span className="ml-2">
                        <Pill tone="slate">personal email</Pill>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{l.sampleOrgName ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">{l.sampleCountry ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-ink">{l.requestCount}</td>
                  <td className="px-4 py-3 text-xs text-ink-faint">
                    {formatDate(l.firstSeenAt)}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-faint">
                    {formatDate(l.lastSeenAt)}
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
