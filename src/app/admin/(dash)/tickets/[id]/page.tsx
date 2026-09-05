import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TicketDetail, type Comment, type TicketFull, type Assignee } from "./TicketDetail";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ticket, comments, admins] = await Promise.all([
    prisma.ticket.findUnique({ where: { id } }),
    prisma.ticketComment.findMany({ where: { ticketId: id }, orderBy: { createdAt: "asc" } }),
    prisma.user.findMany({ where: { isActive: true, role: { in: ["OWNER", "ADMIN"] } }, select: { id: true, email: true }, orderBy: { email: "asc" } }),
  ]);
  if (!ticket) notFound();

  const t: TicketFull = {
    id: ticket.id,
    subject: ticket.subject,
    question: ticket.question,
    requesterName: ticket.requesterName,
    requesterEmail: ticket.requesterEmail,
    emailDomain: ticket.emailDomain,
    matchedCustomerName: ticket.matchedCustomerName,
    status: ticket.status,
    priority: ticket.priority,
    source: ticket.source,
    assignedToId: ticket.assignedToId,
    createdAt: ticket.createdAt.toISOString(),
  };
  const cs: Comment[] = comments.map((c) => ({
    id: c.id,
    authorEmail: c.authorEmail,
    body: c.body,
    isInternal: c.isInternal,
    system: c.system,
    createdAt: c.createdAt.toISOString(),
  }));
  const assignees: Assignee[] = admins;

  return <TicketDetail ticket={t} comments={cs} assignees={assignees} />;
}
