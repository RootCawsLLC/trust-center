"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { AuthzError } from "@/lib/rbac";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function guard() {
  try {
    return await requireWrite();
  } catch (e) {
    return e instanceof AuthzError ? e : new AuthzError();
  }
}

export async function updateTicket(
  id: string,
  fields: { status?: string; assignedToId?: string | null; note?: string },
): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const data: Record<string, unknown> = {};
  if (fields.status && ["open", "in-progress", "resolved"].includes(fields.status)) data.status = fields.status;
  if (fields.assignedToId !== undefined) data.assignedToId = fields.assignedToId || null;
  if (fields.note !== undefined) data.note = fields.note.slice(0, 4000) || null;
  await prisma.ticket.update({ where: { id }, data });
  await logAudit({ action: "TICKET_UPDATE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "Ticket", targetId: id, metadata: fields });
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
