import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, ClassBadge, Pill } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";
import { matchCustomerByDomain, isFreemail } from "@/lib/salesforce";
import { domainFromEmail } from "@/lib/utils";
import { ArrowLeft, Building2, Mail, Globe, MapPin, Lock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PersonRecord({
  params,
}: {
  params: Promise<{ email: string }>;
}) {
  const { email: raw } = await params;
  const email = decodeURIComponent(raw).toLowerCase();

  const requests = await prisma.downloadRequest.findMany({
    where: { requesterEmail: email },
    orderBy: { createdAt: "desc" },
    include: { ndaAcceptance: true },
  });

  if (requests.length === 0) notFound();

  const latest = requests[0];
  const domain = latest.emailDomain || domainFromEmail(email);
  const match = await matchCustomerByDomain(domain);
  const customer = match.customerId
    ? await prisma.mockSalesforceCustomer.findUnique({
        where: { id: match.customerId },
      })
    : null;

  const ndaCount = requests.filter((r) => r.ndaAcceptance).length;

  return (
    <div>
      <Link
        href="/admin/requests"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink"
      >
        <ArrowLeft size={15} /> Back to requests
      </Link>

      <PageHeader
        title={latest.requesterName}
        description={`${requests.length} request(s) · ${ndaCount} NDA(s) accepted`}
        action={<ClassBadge value={latest.classification} />}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">Requester</h2>
          <dl className="space-y-2 text-sm">
            <Field icon={<Mail size={14} />} label="Email" value={email} />
            <Field icon={<Building2 size={14} />} label="Organization" value={latest.orgName} />
            <Field
              icon={<Globe size={14} />}
              label="Domain"
              value={
                <Link href={`/admin/companies/${encodeURIComponent(domain)}`} className="text-brand-700 hover:underline">
                  {domain}
                </Link>
              }
            />
            <Field icon={<MapPin size={14} />} label="Country" value={latest.country} />
          </dl>
        </div>

        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">Salesforce</h2>
          {customer ? (
            <dl className="space-y-2 text-sm">
              <Field label="Account" value={customer.accountName} />
              <Field label="Tier" value={<Pill tone="emerald">{customer.tier}</Pill>} />
              <Field label="Region" value={customer.region} />
              <Field label="Account owner" value={customer.accountOwner} />
            </dl>
          ) : (
            <div className="text-sm text-ink-soft">
              <p>Not matched to a Salesforce customer.</p>
              <p className="mt-1 text-ink-faint">
                Tracked as a sales {isFreemail(domain) ? "lead (personal email)" : "lead"} for{" "}
                <Link href={`/admin/companies/${encodeURIComponent(domain)}`} className="text-brand-700 hover:underline">
                  {domain}
                </Link>
                .
              </p>
            </div>
          )}
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-semibold text-ink">Download history</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-2.5 font-medium">Document</th>
              <th className="px-4 py-2.5 font-medium">Visibility</th>
              <th className="px-4 py-2.5 font-medium">NDA</th>
              <th className="px-4 py-2.5 font-medium">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-ink">{r.documentTitle}</td>
                <td className="px-4 py-3">
                  {r.documentVisibility === "PRIVATE" ? (
                    <Pill tone="amber">
                      <Lock size={11} className="mr-1" /> Private
                    </Pill>
                  ) : (
                    <Pill tone="emerald">Public</Pill>
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.ndaAcceptance ? (
                    <span className="text-xs text-ink-soft">
                      Signed {formatDate(r.ndaAcceptance.createdAt)}
                    </span>
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
    </div>
  );
}

function Field({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="flex items-center gap-1.5 text-ink-faint">
        {icon}
        {label}
      </dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
