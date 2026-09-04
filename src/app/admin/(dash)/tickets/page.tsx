import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/FilterBar";
import { TicketManager, type AdminTicket, type Assignee } from "./TicketManager";
import { firstStr } from "@/lib/filters";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function TicketsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const status = firstStr(sp.status);
  const q = firstStr(sp.q)?.trim();

  const where: import("@prisma/client").Prisma.TicketWhereInput = {};
  if (status && ["open", "in-progress", "resolved"].includes(status)) where.status = status;
  if (q) {
    where.OR = [
      { question: { contains: q, mode: "insensitive" } },
      { requesterEmail: { contains: q, mode: "insensitive" } },
      { emailDomain: { contains: q, mode: "insensitive" } },
      { matchedCustomerName: { contains: q, mode: "insensitive" } },
    ];
  }

  const [tickets, admins] = await Promise.all([
    prisma.ticket.findMany({ where, orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 300 }),
    prisma.user.findMany({ where: { isActive: true, role: { in: ["OWNER", "ADMIN"] } }, select: { id: true, email: true }, orderBy: { email: "asc" } }),
  ]);

  const items: AdminTicket[] = tickets.map((t) => ({
    id: t.id,
    subject: t.subject,
    question: t.question,
    requesterName: t.requesterName,
    requesterEmail: t.requesterEmail,
    emailDomain: t.emailDomain,
    matchedCustomerName: t.matchedCustomerName,
    status: t.status,
    source: t.source,
    assignedToId: t.assignedToId,
    createdAt: t.createdAt.toISOString(),
  }));
  const assignees: Assignee[] = admins;

  return (
    <div>
      <PageHeader
        title="Tickets"
        description="Requests for assistance from the public trust center (and the AI assistant's fallback). Assign, triage, and resolve."
      />
      <FilterBar
        searchPlaceholder="Search question, email, domain, customer…"
        selects={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "open", label: "Open" },
              { value: "in-progress", label: "In progress" },
              { value: "resolved", label: "Resolved" },
            ],
          },
        ]}
      />
      <TicketManager tickets={items} assignees={assignees} />
    </div>
  );
}
