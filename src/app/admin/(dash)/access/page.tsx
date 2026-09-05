import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModuleView } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { getOrgSettings } from "@/lib/settings";
import { AccessManager, type PendingItem, type DecidedItem, type Rule } from "./AccessManager";

export const dynamic = "force-dynamic";

export default async function AccessPage() {
  await requireModuleView("access");
  const [settings, pendingRows, decidedRows, rules] = await Promise.all([
    getOrgSettings(),
    prisma.accessApproval.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      include: { downloadRequest: { select: { requesterName: true, requesterEmail: true, emailDomain: true, orgName: true, documentTitle: true, matchedCustomerName: true, createdAt: true } } },
    }),
    prisma.accessApproval.findMany({ where: { status: { not: "pending" } }, orderBy: { decidedAt: "desc" }, take: 25, include: { downloadRequest: { select: { requesterEmail: true, documentTitle: true } } } }),
    prisma.accessRule.findMany({ orderBy: { domain: "asc" } }),
  ]);

  const pending: PendingItem[] = pendingRows.map((p) => ({
    id: p.id,
    requesterName: p.downloadRequest.requesterName,
    requesterEmail: p.downloadRequest.requesterEmail,
    emailDomain: p.downloadRequest.emailDomain,
    orgName: p.downloadRequest.orgName,
    documentTitle: p.downloadRequest.documentTitle,
    matchedCustomerName: p.downloadRequest.matchedCustomerName,
    createdAt: p.createdAt.toISOString(),
  }));
  const decided: DecidedItem[] = decidedRows.map((d) => ({
    id: d.id,
    status: d.status,
    requesterEmail: d.downloadRequest.requesterEmail,
    documentTitle: d.downloadRequest.documentTitle,
    decidedByEmail: d.decidedByEmail,
    reason: d.reason,
    decidedAt: d.decidedAt?.toISOString() ?? null,
  }));
  const ruleItems: Rule[] = rules.map((r) => ({ id: r.id, domain: r.domain, decision: r.decision, note: r.note }));

  return (
    <div>
      <PageHeader
        title="Access requests"
        description="Approve or deny access to confidential documents, and set auto-approval rules for trusted domains. Approved requests get a time-limited download link."
      />
      <div className={`mb-5 rounded-lg px-4 py-3 text-sm ring-1 ring-inset ${settings.approvalMode === "manual" ? "bg-amber-50 text-amber-800 ring-amber-200" : "bg-slate-50 text-ink-soft ring-slate-200"}`}>
        Approval mode: <strong>{settings.approvalMode === "manual" ? "Manual" : "Automatic"}</strong>.{" "}
        {settings.approvalMode === "manual"
          ? "Private-document requests wait here for approval unless a domain rule decides them."
          : "Private-document requests are granted instantly after NDA acceptance."}{" "}
        <Link href="/admin/settings" className="font-medium text-brand-700 hover:underline">Change in Settings</Link>.
      </div>
      <AccessManager pending={pending} decided={decided} rules={ruleItems} />
    </div>
  );
}
