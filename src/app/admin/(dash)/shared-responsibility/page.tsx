import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { ContentManager } from "@/components/admin/ContentManager";
import { saveRaci, deleteRaci } from "../content-actions";

export const dynamic = "force-dynamic";

export default async function SharedResponsibilityPage() {
  const items = await prisma.raciItem.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <PageHeader
        title="Shared responsibility"
        description="Who owns each control area — corporate, product, and customer. Rendered as a matrix on the public trust center."
      />
      <ContentManager
        newLabel="New responsibility"
        items={items.map((r) => ({
          id: r.id,
          area: r.area,
          corporate: r.corporate,
          product: r.product,
          customer: r.customer,
          note: r.note ?? "",
          sortOrder: r.sortOrder,
          isPublished: r.isPublished,
        }))}
        columns={[
          { key: "area", label: "Area" },
          { key: "corporate", label: "Corporate" },
          { key: "product", label: "Product" },
          { key: "customer", label: "Customer" },
          { key: "isPublished", label: "Published", type: "bool" },
        ]}
        fields={[
          { name: "area", label: "Responsibility area", type: "text", required: true, full: true, placeholder: "Data encryption at rest" },
          { name: "corporate", label: "Corporate", type: "text", placeholder: "R / A / C / I or a short note" },
          { name: "product", label: "Product", type: "text" },
          { name: "customer", label: "Customer", type: "text" },
          { name: "sortOrder", label: "Sort order", type: "number" },
          { name: "note", label: "Note", type: "text", full: true },
          { name: "isPublished", label: "Published", type: "checkbox" },
        ]}
        saveAction={saveRaci}
        deleteAction={deleteRaci}
      />
    </div>
  );
}
