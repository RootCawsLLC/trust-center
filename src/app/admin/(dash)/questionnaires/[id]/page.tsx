import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireModuleView } from "@/lib/permissions";
import { Workspace, type WItem } from "./Workspace";

export const dynamic = "force-dynamic";

export default async function QuestionnairePage({ params }: { params: Promise<{ id: string }> }) {
  await requireModuleView("questionnaires");
  const { id } = await params;
  const q = await prisma.questionnaire.findUnique({
    where: { id },
    include: { items: { orderBy: { rowIndex: "asc" } } },
  });
  if (!q) notFound();

  const items: WItem[] = q.items.map((i) => ({
    id: i.id,
    question: i.question,
    finalAnswer: i.finalAnswer ?? "",
    status: i.status,
    confidence: i.confidence,
  }));

  return (
    <Workspace
      questionnaire={{ id: q.id, name: q.name, status: q.status, requesterEmail: q.requesterEmail }}
      items={items}
    />
  );
}
