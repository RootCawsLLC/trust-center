import { prisma } from "@/lib/prisma";
import { requireModuleView } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { TAXONOMIES } from "@/lib/taxonomy";
import { AttributeManager, type Option } from "./AttributeManager";

export const dynamic = "force-dynamic";

export default async function AttributesPage() {
  await requireModuleView("attributes");
  const rows = await prisma.taxonomyOption.findMany({
    orderBy: [{ taxonomy: "asc" }, { sortOrder: "asc" }, { value: "asc" }],
  });

  const optionsByKey: Record<string, Option[]> = {};
  for (const t of TAXONOMIES) optionsByKey[t.key] = [];
  for (const r of rows) {
    (optionsByKey[r.taxonomy] ??= []).push({
      id: r.id,
      value: r.value,
      isActive: r.isActive,
      sortOrder: r.sortOrder,
    });
  }

  const taxonomies = TAXONOMIES.map((t) => ({ key: t.key, label: t.label, group: t.group, hint: t.hint }));

  return (
    <div>
      <PageHeader
        title="Attribute manager"
        description="Manage the controlled vocabularies (frameworks, categories, regions, responsibility areas…) that populate the dropdowns across the admin and public site."
      />
      <AttributeManager taxonomies={taxonomies} optionsByKey={optionsByKey} />
    </div>
  );
}
