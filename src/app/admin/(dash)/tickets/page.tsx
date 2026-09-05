import { prisma } from "@/lib/prisma";
import { requireModuleView } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/FilterBar";
import { TicketManager, type AdminTicket, type Assignee } from "./TicketManager";
import { firstStr } from "@/lib/filters";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function TicketsPage({ searchParams }: { searchParams: SP }) {
  await requireModuleView("tickets");
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

  const priority = firstStr(sp.priority);
  if (priority && ["low", "normal", "high", "urgent"].includes(priority)) where.priority = priority;

  const [tickets, admins, ticketingIntegrations] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 300,
      include: { _count: { select: { comments: true } } },
    }),
    prisma.user.findMany({ where: { isActive: true, role: { in: ["OWNER", "ADMIN"] } }, select: { id: true, email: true }, orderBy: { email: "asc" } }),
    prisma.integration.findMany({ where: { category: "Ticketing" }, select: { name: true, status: true } }),
  ]);
  const connected = ticketingIntegrations.filter((i) => i.status === "connected").map((i) => i.name);

  const items: AdminTicket[] = tickets.map((t) => ({
    id: t.id,
    subject: t.subject,
    question: t.question,
    requesterName: t.requesterName,
    requesterEmail: t.requesterEmail,
    emailDomain: t.emailDomain,
    matchedCustomerName: t.matchedCustomerName,
    status: t.status,
    priority: t.priority,
    source: t.source,
    assignedToId: t.assignedToId,
    createdAt: t.createdAt.toISOString(),
    commentCount: t._count.comments,
  }));
  const assignees: Assignee[] = admins;

  return (
    <div>
      <PageHeader
        title="Tickets"
        description="Requests for assistance from the public trust center (and the AI assistant's fallback). Assign, triage, and resolve."
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-4 py-3 text-sm text-ink-soft ring-1 ring-inset ring-slate-200">
        <span>
          <strong className="text-ink">Native ticketing</strong> is active.{" "}
          {connected.length > 0
            ? `Syncing to ${connected.join(", ")}.`
            : "Connect Freshworks, Zendesk, or Jira Service Management to forward tickets."}
        </span>
        <a href="/admin/integrations" className="font-medium text-brand-700 hover:underline">Manage integrations</a>
      </div>
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
          {
            key: "priority",
            label: "Priority",
            options: [
              { value: "urgent", label: "Urgent" },
              { value: "high", label: "High" },
              { value: "normal", label: "Normal" },
              { value: "low", label: "Low" },
            ],
          },
        ]}
      />
      <TicketManager tickets={items} assignees={assignees} />
    </div>
  );
}
