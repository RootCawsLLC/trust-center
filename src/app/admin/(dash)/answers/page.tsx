import { prisma } from "@/lib/prisma";
import { requireModuleView } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { ContentManager } from "@/components/admin/ContentManager";
import { getTaxonomySelectOptions } from "@/lib/taxonomy";
import { saveAnswer, deleteAnswer } from "./actions";

export const dynamic = "force-dynamic";

export default async function AnswersPage() {
  await requireModuleView("answers");
  const [items, categoryOptions] = await Promise.all([
    prisma.answerLibraryEntry.findMany({ orderBy: [{ category: "asc" }, { sortOrder: "asc" }] }),
    getTaxonomySelectOptions("knowledge.category"),
  ]);

  return (
    <div>
      <PageHeader
        title="Answer library"
        description="Curated, owned Q&A that grounds questionnaire answers. Keep entries reviewed and tagged so drafts stay accurate."
      />
      <ContentManager
        newLabel="New answer"
        items={items.map((a) => ({
          id: a.id,
          question: a.question,
          answer: a.answer,
          category: a.category,
          tags: a.tags.join(", "),
          ownerEmail: a.ownerEmail ?? "",
          confidence: a.confidence,
          isPublished: a.isPublished,
        }))}
        columns={[
          { key: "question", label: "Question" },
          { key: "category", label: "Category" },
          { key: "confidence", label: "Confidence" },
          { key: "isPublished", label: "Published", type: "bool" },
        ]}
        fields={[
          { name: "question", label: "Question", type: "textarea", required: true, full: true },
          { name: "answer", label: "Answer", type: "textarea", required: true, full: true },
          { name: "category", label: "Category", type: "select", options: categoryOptions },
          { name: "confidence", label: "Confidence", type: "select", options: [{ value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }] },
          { name: "tags", label: "Tags (comma-separated)", type: "text", full: true, placeholder: "encryption, at rest, aes-256" },
          { name: "ownerEmail", label: "Owner (email)", type: "text" },
          { name: "isPublished", label: "Published (usable for drafts)", type: "checkbox" },
        ]}
        saveAction={saveAnswer}
        deleteAction={deleteAnswer}
      />
    </div>
  );
}
