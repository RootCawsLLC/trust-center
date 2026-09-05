import { prisma } from "@/lib/prisma";
import { requireModuleView } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/FilterBar";
import { SavedViews } from "@/components/admin/SavedViews";
import { getSession } from "@/lib/session";
import { DocumentManager, type AdminDoc } from "./DocumentManager";
import { CATEGORY_ORDER, CATEGORY_SINGULAR, DOC_STATUSES } from "@/lib/constants";
import { getTaxonomyOptions } from "@/lib/taxonomy";
import { firstStr } from "@/lib/filters";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function DocumentsPage({ searchParams }: { searchParams: SP }) {
  await requireModuleView("documents");
  const sp = await searchParams;
  const q = firstStr(sp.q)?.trim();
  const category = firstStr(sp.category);
  const visibility = firstStr(sp.visibility);
  const status = firstStr(sp.status);

  const where: Prisma.DocumentWhereInput = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { fileName: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (CATEGORY_ORDER.includes(category as never)) where.category = category as never;
  if (visibility === "PUBLIC" || visibility === "PRIVATE") where.visibility = visibility;
  if (status) where.status = status;

  const [docs, templates, frameworks, industries, regions] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { requests: true } } },
    }),
    prisma.ndaTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    getTaxonomyOptions("document.framework"),
    getTaxonomyOptions("document.industry"),
    getTaxonomyOptions("document.region"),
  ]);

  const session = await getSession();
  const savedViews = session?.user?.id
    ? await prisma.savedView.findMany({
        where: { userId: session.user.id, path: "/admin/documents" },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, query: true },
      })
    : [];

  const adminDocs: AdminDoc[] = docs.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    category: d.category,
    visibility: d.visibility,
    version: d.version,
    isPublished: d.isPublished,
    status: d.status,
    fileName: d.fileName,
    sizeBytes: d.sizeBytes,
    ndaTemplateId: d.ndaTemplateId,
    requestCount: d._count.requests,
    industries: d.industries,
    regions: d.regions,
    frameworks: d.frameworks,
  }));

  return (
    <div>
      <PageHeader
        title="Documents"
        description="Create, upload, and publish documents. Set each one public or private."
      />
      <SavedViews views={savedViews} />
      <FilterBar
        searchPlaceholder="Search title, file, description…"
        selects={[
          {
            key: "category",
            label: "Category",
            options: CATEGORY_ORDER.map((c) => ({ value: c, label: CATEGORY_SINGULAR[c] })),
          },
          {
            key: "visibility",
            label: "Visibility",
            options: [
              { value: "PUBLIC", label: "Public" },
              { value: "PRIVATE", label: "Private" },
            ],
          },
          {
            key: "status",
            label: "Status",
            options: DOC_STATUSES.map((s) => ({ value: s, label: s })),
          },
        ]}
      />
      <DocumentManager docs={adminDocs} ndaTemplates={templates} taxonomies={{ frameworks, industries, regions }} />
    </div>
  );
}
