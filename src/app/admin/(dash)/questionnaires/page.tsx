import { prisma } from "@/lib/prisma";
import { requireModuleView } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { QuestionnaireList, type QListItem } from "./QuestionnaireList";

export const dynamic = "force-dynamic";

export default async function QuestionnairesPage() {
  await requireModuleView("questionnaires");
  const rows = await prisma.questionnaire.findMany({
    orderBy: { createdAt: "desc" },
    include: { items: { select: { status: true } } },
  });
  const items: QListItem[] = rows.map((q) => ({
    id: q.id,
    name: q.name,
    requesterEmail: q.requesterEmail,
    status: q.status,
    total: q.items.length,
    approved: q.items.filter((i) => i.status === "approved").length,
    createdAt: q.createdAt.toISOString(),
  }));

  return (
    <div>
      <PageHeader
        title="Questionnaires"
        description="Answer inbound security questionnaires fast. Upload or paste the questions; we draft answers from your answer library, you review and approve, then export."
      />
      <QuestionnaireList items={items} />
    </div>
  );
}
