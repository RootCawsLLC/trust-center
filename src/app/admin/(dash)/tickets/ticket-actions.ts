"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { AuthzError } from "@/lib/rbac";
import { requireModule } from "@/lib/permissions";
import { matchCustomerByDomain } from "@/lib/salesforce";

export type ActionResult = { ok: true } | { ok: false; error: string };

const STATUSES = ["open", "in-progress", "resolved"];
const PRIORITIES = ["low", "normal", "high", "urgent"];

async function guard() {
  try {
    return await requireModule("tickets", "edit");
  } catch (e) {
    return e instanceof AuthzError ? e : new AuthzError();
  }
}

// Record a system activity line on the ticket thread (status/assignment/priority
// changes), so the ticket carries its own history like a normal helpdesk.
async function systemNote(ticketId: string, email: string | null | undefined, body: string) {
  await prisma.ticketComment.create({
    data: { ticketId, authorEmail: email ?? null, body, system: true, isInternal: true },
  });
}

export async function updateTicket(
  id: string,
  fields: { status?: string; assignedToId?: string | null; priority?: string; subject?: string; note?: string },
): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };

  const before = await prisma.ticket.findUnique({
    where: { id },
    include: { assignedTo: { select: { email: true } } },
  });
  if (!before) return { ok: false, error: "Ticket not found." };

  const data: Record<string, unknown> = {};
  const activity: string[] = [];
  if (fields.status && STATUSES.includes(fields.status) && fields.status !== before.status) {
    data.status = fields.status;
    activity.push(`changed status ${before.status} → ${fields.status}`);
  }
  if (fields.priority && PRIORITIES.includes(fields.priority) && fields.priority !== before.priority) {
    data.priority = fields.priority;
    activity.push(`set priority to ${fields.priority}`);
  }
  if (fields.assignedToId !== undefined) {
    const next = fields.assignedToId || null;
    if (next !== before.assignedToId) {
      data.assignedToId = next;
      let toEmail = "Unassigned";
      if (next) toEmail = (await prisma.user.findUnique({ where: { id: next }, select: { email: true } }))?.email ?? next;
      activity.push(`assigned to ${toEmail}`);
    }
  }
  if (fields.subject !== undefined && fields.subject.trim() && fields.subject.trim() !== before.subject) {
    data.subject = fields.subject.trim().slice(0, 300);
    activity.push("edited the subject");
  }
  if (fields.note !== undefined) data.note = fields.note.slice(0, 4000) || null;

  if (Object.keys(data).length === 0) return { ok: true };
  await prisma.ticket.update({ where: { id }, data });
  for (const line of activity) await systemNote(id, g.user.email, line);

  await logAudit({ action: "TICKET_UPDATE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "Ticket", targetId: id, metadata: { ...data } });
  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${id}`);
  return { ok: true };
}

export async function addComment(ticketId: string, body: string, isInternal: boolean): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const text = body.trim();
  if (!text) return { ok: false, error: "Comment can't be empty." };
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
  if (!ticket) return { ok: false, error: "Ticket not found." };
  await prisma.ticketComment.create({
    data: { ticketId, authorId: g.user.id, authorEmail: g.user.email, body: text.slice(0, 8000), isInternal },
  });
  await logAudit({ action: "TICKET_COMMENT", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "Ticket", targetId: ticketId, metadata: { isInternal } });
  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${ticketId}`);
  return { ok: true };
}

export async function createTicket(fields: { subject: string; question: string; requesterEmail?: string; priority?: string }): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const subject = fields.subject.trim();
  const question = fields.question.trim();
  if (!subject || !question) return { ok: false, error: "Subject and details are required." };
  const email = (fields.requesterEmail ?? "").trim().toLowerCase();
  const domain = email.includes("@") ? email.split("@")[1] : null;
  const match = domain ? await matchCustomerByDomain(domain) : null;
  const t = await prisma.ticket.create({
    data: {
      subject: subject.slice(0, 300),
      question: question.slice(0, 8000),
      requesterEmail: email || null,
      emailDomain: domain,
      matchedCustomerName: match?.customerName ?? null,
      priority: PRIORITIES.includes(fields.priority ?? "") ? fields.priority! : "normal",
      source: "manual",
      status: "open",
    },
  });
  await logAudit({ action: "TICKET_CREATE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "Ticket", targetId: t.id, metadata: { source: "manual" } });
  revalidatePath("/admin/tickets");
  return { ok: true };
}

export async function deleteTicket(id: string): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  await prisma.ticket.delete({ where: { id } });
  await logAudit({ action: "TICKET_DELETE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "Ticket", targetId: id });
  revalidatePath("/admin/tickets");
  return { ok: true };
}
