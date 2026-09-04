import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PageHeader, Pill } from "@/components/admin/ui";
import { formatDate, bytesToSize } from "@/lib/utils";
import { ArrowLeft, Eye, FileClock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function VersionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [doc, versions, requests] = await Promise.all([
    prisma.document.findUnique({ where: { id } }),
    prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { email: true } } },
    }),
    prisma.downloadRequest.findMany({
      where: { documentId: id },
      orderBy: { createdAt: "desc" },
      include: { ndaAcceptance: { select: { id: true } } },
    }),
  ]);
  if (!doc) notFound();

  // Group requests by the version snapshot captured at download time.
  const byVersion = new Map<string, typeof requests>();
  for (const r of requests) {
    const key = r.documentVersion ?? "—";
    if (!byVersion.has(key)) byVersion.set(key, []);
    byVersion.get(key)!.push(r);
  }

  return (
    <div>
      <Link href="/admin/documents" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink">
        <ArrowLeft size={15} /> Back to documents
      </Link>
      <PageHeader
        title={doc.title}
        description={`Version history · current v${doc.version} · ${requests.length} total request(s)`}
        action={<Pill tone="emerald">{doc.status}</Pill>}
      />

      <div className="space-y-4">
        {versions.map((v, i) => {
          const reqs = byVersion.get(v.version) ?? [];
          const isCurrent = v.version === doc.version && i === 0;
          return (
            <div key={v.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <FileClock size={16} className="text-brand-600" />
                    <h3 className="font-semibold text-ink">Version {v.version}</h3>
                    {isCurrent && <Pill tone="emerald">Current</Pill>}
                  </div>
                  <div className="mt-1 text-sm text-ink-faint">
                    {v.fileName} · {bytesToSize(v.sizeBytes)} · added {formatDate(v.createdAt)}
                    {v.createdBy?.email && <> · by {v.createdBy.email}</>}
                  </div>
                  {v.note && <div className="mt-1 text-sm text-ink-soft">{v.note}</div>}
                </div>
                <a
                  href={`/api/admin/version-file/${v.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  <Eye size={15} /> View this version
                </a>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
                  Downloaded by ({reqs.length})
                </div>
                {reqs.length === 0 ? (
                  <p className="text-sm text-ink-faint">No recorded downloads of this version.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-slate-100">
                        {reqs.map((r) => (
                          <tr key={r.id}>
                            <td className="py-2 pr-4">
                              <Link href={`/admin/people/${encodeURIComponent(r.requesterEmail)}`} className="font-medium text-brand-700 hover:underline">
                                {r.requesterName}
                              </Link>
                              <div className="text-xs text-ink-faint">{r.requesterEmail}</div>
                            </td>
                            <td className="py-2 pr-4">
                              <Link href={`/admin/companies/${encodeURIComponent(r.emailDomain)}`} className="text-xs text-brand-700 hover:underline">
                                {r.orgName}
                              </Link>
                            </td>
                            <td className="py-2 pr-4">
                              {r.ndaAcceptance ? <Pill tone="emerald">NDA</Pill> : <span className="text-xs text-ink-faint">—</span>}
                            </td>
                            <td className="py-2 text-right text-xs text-ink-faint">{formatDate(r.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {byVersion.has("—") && (
          <div className="card p-5">
            <h3 className="font-semibold text-ink">Requests before version tracking</h3>
            <p className="mt-1 text-sm text-ink-faint">
              {byVersion.get("—")!.length} request(s) were captured before per-version
              snapshots were recorded.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
