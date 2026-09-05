import { prisma } from "@/lib/prisma";
import { requireModuleView } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { ContentManager } from "@/components/admin/ContentManager";
import { FilterBar } from "@/components/admin/FilterBar";
import { getTaxonomyOptions } from "@/lib/taxonomy";
import { firstStr } from "@/lib/filters";
import { saveAnswer, deleteAnswer } from "./actions";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AnswersPage({ searchParams }: { searchParams: SP }) {
  await requireModuleView("answers");
  const sp = await searchParams;
  const q = firstStr(sp.q)?.trim();
  const category = firstStr(sp.category);
  const confidence = firstStr(sp.confidence);

  const categoryValues = await getTaxonomyOptions("knowledge.category");
  const where: Prisma.AnswerLibraryEntryWhereInput = {};
  if (q) {
    where.OR = [
      { question: { contains: q, mode: "insensitive" } },
      { answer: { contains: q, mode: "insensitive" } },
      { tags: { has: q.toLowerCase() } },
    ];
  }
  if (category) where.category = category;
  if (confidence && ["high", "medium", "low"].includes(confidence)) where.confidence = confidence;

  const items = await prisma.answerLibraryEntry.findMany({ where, orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  const categoryOptions = categoryValues.map((v) => ({ value: v, label: v }));

  return (
    <div>
      <PageHeader
        title="Answer library"
        description="Curated, owned Q&A that grounds questionnaire answers. Search and filter to keep entries reviewed and tagged so drafts stay accurate."
      />
      <FilterBar
        searchPlaceholder="Search questions, answers, tags…"
        selects={[
          { key: "category", label: "Category", options: categoryOptions },
          {
            key: "confidence",
            label: "Confidence",
            options: [
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ],
          },
        ]}
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
