import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { ContentManager } from "@/components/admin/ContentManager";
import { saveRaci, deleteRaci } from "../content-actions";
import { reorderRaci } from "../reorder-actions";
import { getTaxonomySelectOptions } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function SharedResponsibilityPage() {
  const [items, areaOptions] = await Promise.all([
    prisma.raciItem.findMany({ orderBy: { sortOrder: "asc" } }),
    getTaxonomySelectOptions("raci.area"),
  ]);
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
          { name: "area", label: "Responsibility area", type: "select", options: areaOptions, full: true },
          { name: "corporate", label: "Corporate", type: "text", placeholder: "R / A / C / I or a short note" },
          { name: "product", label: "Product", type: "text" },
          { name: "customer", label: "Customer", type: "text" },
          { name: "note", label: "Note", type: "text", full: true },
          { name: "isPublished", label: "Published", type: "checkbox" },
        ]}
        saveAction={saveRaci}
        deleteAction={deleteRaci}
        reorderAction={reorderRaci}
      />
    </div>
  );
}
