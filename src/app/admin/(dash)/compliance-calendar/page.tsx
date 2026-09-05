import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { ContentManager } from "@/components/admin/ContentManager";
import { saveEvent, deleteEvent } from "../content-actions";
import { reorderEvents } from "../reorder-actions";
import { getTaxonomySelectOptions } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function ComplianceCalendarPage() {
  const [items, frameworkOptions, productOptions] = await Promise.all([
    prisma.complianceEvent.findMany({ orderBy: { sortOrder: "asc" } }),
    getTaxonomySelectOptions("compliance.framework"),
    getTaxonomySelectOptions("compliance.product"),
  ]);
  return (
    <div>
      <PageHeader
        title="Compliance calendar"
        description="Planned audit windows and expected releases shown on the public trust center."
      />
      <ContentManager
        newLabel="New event"
        items={items.map((e) => ({
          id: e.id,
          title: e.title,
          window: e.window,
          framework: e.framework ?? "",
          product: e.product ?? "",
          detail: e.detail ?? "",
          status: e.status,
          sortOrder: e.sortOrder,
          isPublished: e.isPublished,
        }))}
        columns={[
          { key: "title", label: "Event" },
          { key: "window", label: "Window" },
          { key: "framework", label: "Framework" },
          { key: "status", label: "Status" },
          { key: "isPublished", label: "Published", type: "bool" },
        ]}
        fields={[
          { name: "title", label: "Event", type: "text", required: true, full: true, placeholder: "SOC 2 Type II report" },
          { name: "window", label: "Window / date", type: "text", required: true, placeholder: "Expected Q3 2026" },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: [
              { value: "planned", label: "Planned" },
              { value: "in-progress", label: "In progress" },
              { value: "complete", label: "Complete" },
            ],
          },
          { name: "framework", label: "Framework", type: "select", options: [{ value: "", label: "—" }, ...frameworkOptions] },
          { name: "product", label: "Product", type: "select", options: [{ value: "", label: "—" }, ...productOptions] },
          { name: "detail", label: "Detail", type: "text", full: true },
          { name: "isPublished", label: "Published", type: "checkbox" },
        ]}
        saveAction={saveEvent}
        deleteAction={deleteEvent}
        reorderAction={reorderEvents}
      />
    </div>
  );
}
