import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { ContentManager } from "@/components/admin/ContentManager";
import { saveUpdate, deleteUpdate } from "../content-actions";

export const dynamic = "force-dynamic";

export default async function UpdatesPage() {
  const items = await prisma.trustUpdate.findMany({ orderBy: { publishedAt: "desc" } });
  return (
    <div>
      <PageHeader
        title="Updates"
        description="Product & compliance updates shown on the public trust center."
      />
      <ContentManager
        newLabel="New update"
        items={items.map((u) => ({
          id: u.id,
          title: u.title,
          type: u.type,
          bodyMarkdown: u.bodyMarkdown,
          publishedAt: u.publishedAt.toISOString().slice(0, 10),
          isPublished: u.isPublished,
        }))}
        columns={[
          { key: "title", label: "Title" },
          { key: "type", label: "Type" },
          { key: "publishedAt", label: "Date" },
          { key: "isPublished", label: "Published", type: "bool" },
        ]}
        fields={[
          { name: "title", label: "Title", type: "text", required: true, full: true },
          {
            name: "type",
            label: "Type",
            type: "select",
            options: [
              { value: "update", label: "Update" },
              { value: "new", label: "New" },
              { value: "security", label: "Security" },
              { value: "compliance", label: "Compliance" },
            ],
          },
          { name: "publishedAt", label: "Date", type: "date" },
          { name: "bodyMarkdown", label: "Body", type: "textarea", required: true },
          { name: "isPublished", label: "Published", type: "checkbox" },
        ]}
        saveAction={saveUpdate}
        deleteAction={deleteUpdate}
      />
    </div>
  );
}
