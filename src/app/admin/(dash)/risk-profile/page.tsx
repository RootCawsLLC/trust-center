import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { ContentManager } from "@/components/admin/ContentManager";
import { saveRiskItem, deleteRiskItem } from "../content-actions";

export const dynamic = "force-dynamic";

export default async function RiskProfilePage() {
  const items = await prisma.riskProfileItem.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <PageHeader
        title="Risk profile"
        description="Key security facts (RTO, RPO, encryption…) shown on the public trust center. Only add what isn't already obvious in the knowledge base or RACI."
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
          { name: "category", label: "Category", type: "text", placeholder: "Resilience" },
          { name: "sortOrder", label: "Sort order", type: "number" },
          { name: "label", label: "Fact", type: "text", required: true, full: true, placeholder: "Recovery Time Objective" },
          { name: "value", label: "Value", type: "text", required: true, full: true, placeholder: "4 hours" },
          { name: "isPublished", label: "Published", type: "checkbox" },
        ]}
        saveAction={saveRiskItem}
        deleteAction={deleteRiskItem}
      />
    </div>
  );
}
