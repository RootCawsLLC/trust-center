import { prisma } from "@/lib/prisma";
import { requireModuleView } from "@/lib/permissions";
import { PageHeader, Pill } from "@/components/admin/ui";
import { SortHeader } from "@/components/admin/SortHeader";
import { formatDate } from "@/lib/utils";
import { firstStr, orderByFromParams } from "@/lib/filters";
import { ShieldCheck } from "lucide-react";

const AUDIT_SORTS = ["createdAt", "action", "actorEmail"] as const;
type SP = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";

const ACTION_TONE: Record<string, "slate" | "amber" | "emerald" | "red"> = {
  DOWNLOAD_REQUEST: "slate",
  DOWNLOAD_FILE: "slate",
  NDA_ACCEPT: "emerald",
  DOCUMENT_CREATE: "emerald",
  DOCUMENT_UPDATE: "amber",
  DOCUMENT_DELETE: "red",
  USER_CREATE: "emerald",
  USER_UPDATE: "amber",
};

export default async function AuditPage({ searchParams }: { searchParams: SP }) {
  await requireModuleView("audit");
  const sp = await searchParams;
  const entries = await prisma.auditLog.findMany({
    orderBy: orderByFromParams(firstStr(sp.sort), firstStr(sp.dir), AUDIT_SORTS, { createdAt: "desc" }),
    take: 500,
  });

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="An append-only record of activity across the Trust Center."
      />

      <div className="mb-4">
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
          <ShieldCheck size={13} className="text-emerald-600" /> Immutable — entries
          cannot be edited or deleted
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">
          No audit entries yet.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-4 py-2.5 font-medium"><SortHeader label="Action" sortKey="action" /></th>
                <th className="px-4 py-2.5 font-medium"><SortHeader label="Actor" sortKey="actorEmail" /></th>
                <th className="px-4 py-2.5 font-medium">Target</th>
                <th className="px-4 py-2.5 font-medium">Details</th>
                <th className="px-4 py-2.5 font-medium"><SortHeader label="When" sortKey="createdAt" /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((e) => (
                <tr key={e.id} className="align-top">
                  <td className="px-4 py-3">
                    <Pill tone={ACTION_TONE[e.action] ?? "slate"}>{e.action}</Pill>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">
                    {e.actorEmail ?? "—"}
                    {e.ipAddress && (
                      <div className="text-xs text-ink-faint">{e.ipAddress}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-faint">
                    {e.targetType ? `${e.targetType}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-faint">
                    {e.metadata ? (
                      <code className="whitespace-pre-wrap break-all">
                        {JSON.stringify(e.metadata)}
                      </code>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-faint">
                    {formatDate(e.createdAt)}
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
