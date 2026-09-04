import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { ContentManager } from "@/components/admin/ContentManager";
import { saveArticle, deleteArticle } from "../content-actions";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const items = await prisma.knowledgeArticle.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <PageHeader
        title="Knowledge base"
        description="FAQ-style articles shown on the public trust center."
      />
      <ContentManager
        newLabel="New article"
        items={items.map((a) => ({
          id: a.id,
          title: a.title,
          category: a.category,
          bodyMarkdown: a.bodyMarkdown,
          sortOrder: a.sortOrder,
          isPublished: a.isPublished,
        }))}
        columns={[
          { key: "title", label: "Title" },
          { key: "category", label: "Category" },
          { key: "isPublished", label: "Published", type: "bool" },
        ]}
        fields={[
          { name: "title", label: "Title", type: "text", required: true, full: true },
          { name: "category", label: "Category", type: "text", placeholder: "General" },
          { name: "sortOrder", label: "Sort order", type: "number" },
          { name: "bodyMarkdown", label: "Body", type: "textarea", required: true },
          { name: "isPublished", label: "Published", type: "checkbox" },
        ]}
        saveAction={saveArticle}
        deleteAction={deleteArticle}
      />
    </div>
  );
}
