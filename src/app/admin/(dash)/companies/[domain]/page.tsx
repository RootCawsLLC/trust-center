import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, ClassBadge, Pill } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";
import { matchCustomerByDomain, isFreemail } from "@/lib/salesforce";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CompanyRecord({
  params,
}: {
  params: Promise<{ domain: string }>;
}) {
  const { domain: raw } = await params;
  const domain = decodeURIComponent(raw).toLowerCase();

  const requests = await prisma.downloadRequest.findMany({
    where: { emailDomain: domain },
    orderBy: { createdAt: "desc" },
    include: { ndaAcceptance: true },
  });
  if (requests.length === 0) notFound();

  const match = await matchCustomerByDomain(domain);
  const customer = match.customerId
    ? await prisma.mockSalesforceCustomer.findUnique({ where: { id: match.customerId } })
    : null;
  const lead = customer
    ? null
    : await prisma.salesLead.findUnique({ where: { emailDomain: domain } });

  // Unique requesters.
  const peopleMap = new Map<
    string,
    { name: string; email: string; count: number; last: Date }
  >();
  for (const r of requests) {
    const p = peopleMap.get(r.requesterEmail);
    if (p) {
      p.count += 1;
      if (r.createdAt > p.last) p.last = r.createdAt;
    } else {
      peopleMap.set(r.requesterEmail, {
        name: r.requesterName,
        email: r.requesterEmail,
        count: 1,
        last: r.createdAt,
      });
    }
  }
  const people = [...peopleMap.values()].sort((a, b) => b.count - a.count);

  // Unique documents pulled.
  const docMap = new Map<string, { title: string; count: number; last: Date }>();
  for (const r of requests) {
    const d = docMap.get(r.documentTitle);
    if (d) {
      d.count += 1;
      if (r.createdAt > d.last) d.last = r.createdAt;
    } else {
      docMap.set(r.documentTitle, { title: r.documentTitle, count: 1, last: r.createdAt });
    }
  }
  const docs = [...docMap.values()].sort((a, b) => b.count - a.count);

  return (
    <div>
      <Link
        href="/admin/leads"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink"
      >
        <ArrowLeft size={15} /> Back to leads
      </Link>

      <PageHeader
        title={customer ? customer.accountName : domain}
        description={`${domain} · ${people.length} contact(s) · ${requests.length} request(s)`}
        action={<ClassBadge value={customer ? "CUSTOMER" : "LEAD"} />}
      />

      <div className="card p-5">
        {customer ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-4">
            <F label="Account" v={customer.accountName} />
            <F label="Tier" v={<Pill tone="emerald">{customer.tier}</Pill>} />
            <F label="Region" v={customer.region} />
            <F label="Account owner" v={customer.accountOwner} />
            <F label="Primary domain" v={customer.primaryDomain} />
            {customer.additionalDomains.length > 0 && (
              <F label="Other domains" v={customer.additionalDomains.join(", ")} />
            )}
          </dl>
        ) : (
          <dl className="grid gap-3 text-sm sm:grid-cols-4">
            <F label="Status" v={<Pill tone="blue">Sales lead</Pill>} />
            <F label="Domain" v={isFreemail(domain) ? `${domain} (personal)` : domain} />
            <F label="Sample org" v={lead?.sampleOrgName ?? requests[0].orgName} />
            <F label="Sample country" v={lead?.sampleCountry ?? requests[0].country} />
            <F label="First seen" v={lead ? formatDate(lead.firstSeenAt) : "—"} />
            <F label="Requests" v={String(lead?.requestCount ?? requests.length)} />
          </dl>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold text-ink">Contacts</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-faint">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Person</th>
                  <th className="px-4 py-2.5 font-medium">Requests</th>
                  <th className="px-4 py-2.5 font-medium">Last</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {people.map((p) => (
                  <tr key={p.email}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/people/${encodeURIComponent(p.email)}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {p.name}
                      </Link>
                      <div className="text-xs text-ink-faint">{p.email}</div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{p.count}</td>
                    <td className="px-4 py-3 text-xs text-ink-faint">{formatDate(p.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-ink">Documents pulled</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-faint">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Document</th>
                  <th className="px-4 py-2.5 font-medium">Times</th>
                  <th className="px-4 py-2.5 font-medium">Last</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {docs.map((d) => (
                  <tr key={d.title}>
                    <td className="px-4 py-3 text-ink">{d.title}</td>
                    <td className="px-4 py-3 text-ink-soft">{d.count}</td>
                    <td className="px-4 py-3 text-xs text-ink-faint">{formatDate(d.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function F({ label, v }: { label: string; v: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-0.5 font-medium text-ink">{v}</dd>
    </div>
  );
}
