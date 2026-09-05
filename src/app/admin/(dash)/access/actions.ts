"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/permissions";
import { AuthzError } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { issueGrant } from "@/lib/access";
import { enqueueNotification } from "@/lib/notifications";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function guard() {
  try {
    return await requireModule("access", "edit");
  } catch (e) {
    return e instanceof AuthzError ? e : new AuthzError();
  }
}

// Approve a pending access request: issue a time-limited grant and (scaffold)
// email the download link to the requester.
export async function approveAccess(id: string): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const approval = await prisma.accessApproval.findUnique({
    where: { id },
    include: { downloadRequest: { select: { id: true, requesterEmail: true, documentTitle: true } } },
  });
  if (!approval) return { ok: false, error: "Request not found." };
  if (approval.status !== "pending") return { ok: false, error: "This request has already been decided." };

  await prisma.accessApproval.update({
    where: { id },
    data: { status: "approved", decidedById: g.user.id, decidedByEmail: g.user.email, decidedAt: new Date() },
  });
  await issueGrant(approval.downloadRequestId);
  await enqueueNotification({
    event: "manual",
    subject: `Access approved: ${approval.downloadRequest.documentTitle}`,
    body: `A time-limited download link has been issued to ${approval.downloadRequest.requesterEmail}.`,
    createdById: g.user.id,
  });
  await logAudit({ action: "ACCESS_APPROVE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "DownloadRequest", targetId: approval.downloadRequestId, metadata: { requester: approval.downloadRequest.requesterEmail } });
  revalidatePath("/admin/access");
  return { ok: true };
}

export async function denyAccess(id: string, reason: string): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const approval = await prisma.accessApproval.findUnique({ where: { id } });
  if (!approval) return { ok: false, error: "Request not found." };
  if (approval.status !== "pending") return { ok: false, error: "This request has already been decided." };
  await prisma.accessApproval.update({
    where: { id },
    data: { status: "denied", decidedById: g.user.id, decidedByEmail: g.user.email, decidedAt: new Date(), reason: reason.slice(0, 500) || null },
  });
  await logAudit({ action: "ACCESS_DENY", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "DownloadRequest", targetId: approval.downloadRequestId, metadata: { reason } });
  revalidatePath("/admin/access");
  return { ok: true };
}

export async function saveRule(domain: string, decision: string, note: string): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const d = domain.trim().toLowerCase().replace(/^@/, "");
  if (!d || !d.includes(".")) return { ok: false, error: "Enter a valid domain (e.g. acme.com)." };
  const dec = decision === "deny" ? "deny" : "approve";
  try {
    await prisma.accessRule.upsert({
      where: { domain: d },
      update: { decision: dec, note: note.slice(0, 200) || null },
      create: { domain: d, decision: dec, note: note.slice(0, 200) || null },
    });
  } catch {
    return { ok: false, error: "Could not save the rule." };
  }
  await logAudit({ action: "ACCESS_RULE_SAVE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "AccessRule", metadata: { domain: d, decision: dec } });
  revalidatePath("/admin/access");
  return { ok: true };
}

export async function deleteRule(id: string): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  await prisma.accessRule.delete({ where: { id } });
  await logAudit({ action: "ACCESS_RULE_DELETE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "AccessRule", targetId: id });
  revalidatePath("/admin/access");
  return { ok: true };
}
