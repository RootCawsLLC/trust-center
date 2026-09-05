import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModuleView } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { getOrgSettings } from "@/lib/settings";
import { NdaManager, type AdminNda } from "./NdaManager";

export const dynamic = "force-dynamic";

export default async function NdaPage() {
  await requireModuleView("nda");
  const settings = await getOrgSettings();
  const templates = await prisma.ndaTemplate.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: { _count: { select: { documents: true, acceptances: true } } },
  });

  const items: AdminNda[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    bodyMarkdown: t.bodyMarkdown,
    contentHtml: t.contentHtml,
    fileName: t.fileName,
    isDefault: t.isDefault,
    isActive: t.isActive,
    documentCount: t._count.documents,
    acceptanceCount: t._count.acceptances,
  }));

  return (
    <div>
      <PageHeader
        title="NDA templates"
        description="Manage the click-through NDAs shown before private downloads. Upload your own language or edit the default."
      />
      <div className={`mb-5 rounded-lg px-4 py-3 text-sm ring-1 ring-inset ${settings.customerNdaBypass ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-slate-50 text-ink-soft ring-slate-200"}`}>
        <p className="font-medium text-ink">Who has to sign?</p>
        <p className="mt-1">
          {settings.customerNdaBypass ? (
            <>
              <strong>Active Salesforce customers are exempt</strong> — their master agreement already covers confidentiality, so they skip the click-through NDA. Leads and unmatched visitors still sign.
            </>
          ) : (
            <><strong>Everyone signs</strong> the click-through NDA for confidential documents. You can instead exempt active customers (covered by their MSA) — this relies on the Salesforce match.</>
          )}{" "}
          <Link href="/admin/settings" className="font-medium text-brand-700 hover:underline">Change in Settings</Link>
          {" · "}
          <Link href="/admin/integrations" className="font-medium text-brand-700 hover:underline">Salesforce integration</Link>
        </p>
      </div>
      <NdaManager templates={items} />
    </div>
  );
}
