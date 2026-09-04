import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { NdaManager, type AdminNda } from "./NdaManager";

export const dynamic = "force-dynamic";

export default async function NdaPage() {
  const templates = await prisma.ndaTemplate.findMany({
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    include: { _count: { select: { documents: true, acceptances: true } } },
  });

  const items: AdminNda[] = templates.map((t) => ({
    id: t.id,
    name: t.name,
    bodyMarkdown: t.bodyMarkdown,
    contentHtml: t.contentHtml,
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
      <NdaManager templates={items} />
    </div>
  );
}
