import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { DocumentManager, type AdminDoc } from "./DocumentManager";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const [docs, templates] = await Promise.all([
    prisma.document.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { requests: true } } },
    }),
    prisma.ndaTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const adminDocs: AdminDoc[] = docs.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    category: d.category,
    visibility: d.visibility,
    version: d.version,
    isPublished: d.isPublished,
    fileName: d.fileName,
    sizeBytes: d.sizeBytes,
    ndaTemplateId: d.ndaTemplateId,
    requestCount: d._count.requests,
  }));

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Create, upload, and publish documents. Set each one public or private."
      />
      <DocumentManager docs={adminDocs} ndaTemplates={templates} />
    </div>
  );
}
