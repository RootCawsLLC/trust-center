import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { ContentManager } from "@/components/admin/ContentManager";
import { saveCertification, deleteCertification } from "../content-actions";

export const dynamic = "force-dynamic";

export default async function CertificationsPage() {
  const items = await prisma.certification.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <PageHeader
        title="Certifications"
        description="Detail pages behind each compliance badge — how you comply, products in scope, and scoped documents."
      />
      <ContentManager
        newLabel="New certification"
        items={items.map((c) => ({
          id: c.id,
          framework: c.framework,
          displayName: c.displayName,
          status: c.status,
          summaryHtml: c.summaryHtml ?? "",
          productsInScope: c.productsInScope.join(", "),
          sortOrder: c.sortOrder,
          isPublished: c.isPublished,
        }))}
        columns={[
          { key: "framework", label: "Framework" },
          { key: "displayName", label: "Display name" },
          { key: "status", label: "Status" },
          { key: "isPublished", label: "Published", type: "bool" },
        ]}
        fields={[
          { name: "framework", label: "Framework (must match document tags, e.g. SOC 2)", type: "text", required: true },
          { name: "displayName", label: "Display name", type: "text" },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "Certified", label: "Certified" },
              { value: "In progress", label: "In progress" },
              { value: "Planned", label: "Planned" },
            ],
          },
          { name: "sortOrder", label: "Sort order", type: "number" },
          { name: "productsInScope", label: "Products in scope (comma-separated)", type: "text", full: true, placeholder: "Platform, GovCloud, Mobile" },
          { name: "summaryHtml", label: "How we comply (rich text)", type: "richtext", full: true },
          { name: "isPublished", label: "Published", type: "checkbox" },
        ]}
        saveAction={saveCertification}
        deleteAction={deleteCertification}
      />
    </div>
  );
}
