import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { ContentManager } from "@/components/admin/ContentManager";
import { saveArticle, deleteArticle } from "../content-actions";
import { reorderArticles } from "../reorder-actions";
import { getTaxonomySelectOptions } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const [items, categoryOptions] = await Promise.all([
    prisma.knowledgeArticle.findMany({ orderBy: { sortOrder: "asc" } }),
    getTaxonomySelectOptions("knowledge.category"),
  ]);
  return (
    <div>
      <PageHeader
        title="Knowledge base"
        description="FAQ-style articles shown on the public trust center. Each entry can be rich text, a link, or an attached document."
      />
      <ContentManager
        newLabel="New article"
        items={items.map((a) => ({
          id: a.id,
          title: a.title,
          category: a.category,
          contentHtml: a.contentHtml ?? "",
          url: a.url ?? "",
          file: a.fileName ?? "",
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
          {
            name: "category",
            label: "Category",
            type: "select",
            options: categoryOptions,
          },
          {
            name: "contentHtml",
            label: "Body (rich text)",
            type: "richtext",
            full: true,
            placeholder: "Write the article… or leave blank and provide a URL or file below",
          },
          {
            name: "url",
            label: "External URL (optional)",
            type: "text",
            full: true,
            placeholder: "https://…",
            hint: "Link out instead of writing a body.",
          },
          {
            name: "file",
            label: "Attach a document (optional)",
            type: "file",
            full: true,
            accept: ".pdf,.doc,.docx,.xlsx,.csv,.txt,.md",
          },
          { name: "isPublished", label: "Published", type: "checkbox" },
        ]}
        saveAction={saveArticle}
        deleteAction={deleteArticle}
        reorderAction={reorderArticles}
      />
    </div>
  );
}
