import { prisma } from "@/lib/prisma";
import { requireModuleView } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { ContentManager } from "@/components/admin/ContentManager";
import { saveRiskItem, deleteRiskItem } from "../content-actions";
import { reorderRiskItems } from "../reorder-actions";
import { getTaxonomySelectOptions } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function RiskProfilePage() {
  await requireModuleView("risk-profile");
  const [items, categoryOptions] = await Promise.all([
    prisma.riskProfileItem.findMany({ orderBy: { sortOrder: "asc" } }),
    getTaxonomySelectOptions("risk.category"),
  ]);
  return (
    <div>
      <PageHeader
        title="Risk profile"
        description="Key security facts (RTO, RPO, encryption…) shown on the public trust center. Only add what isn't already obvious in the FAQ or RACI."
      />
      <ContentManager
        newLabel="New fact"
        items={items.map((r) => ({
          id: r.id,
          category: r.category,
          label: r.label,
          value: r.value,
          sortOrder: r.sortOrder,
          isPublished: r.isPublished,
        }))}
        columns={[
          { key: "category", label: "Category" },
          { key: "label", label: "Fact" },
          { key: "value", label: "Value" },
          { key: "isPublished", label: "Published", type: "bool" },
        ]}
        fields={[
          { name: "category", label: "Category", type: "select", options: categoryOptions },
          { name: "label", label: "Fact", type: "text", required: true, full: true, placeholder: "Recovery Time Objective" },
          { name: "value", label: "Value", type: "text", required: true, full: true, placeholder: "4 hours" },
          { name: "isPublished", label: "Published", type: "checkbox" },
        ]}
        saveAction={saveRiskItem}
        deleteAction={deleteRiskItem}
        reorderAction={reorderRiskItems}
      />
    </div>
  );
}
