"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOwner, requireWrite } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { AuthzError } from "@/lib/rbac";
import type { Role } from "@prisma/client";

export type ActionResult = { ok: true } | { ok: false; error: string };

function s(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

// ---- Groups (Owner-managed) ----
export async function saveGroup(id: string | null, fd: FormData): Promise<ActionResult> {
  let session;
  try {
    session = await requireOwner();
  } catch (e) {
    return { ok: false, error: e instanceof AuthzError ? e.message : "Owner only" };
  }
  const name = s(fd, "name");
  if (!name) return { ok: false, error: "Group name is required." };
  const roleRaw = s(fd, "defaultRole");
  const defaultRole = (["OWNER", "ADMIN", "VIEWER"].includes(roleRaw) ? roleRaw : "VIEWER") as Role;
  const data = { name, description: s(fd, "description") || null, defaultRole };
  try {
    if (id) await prisma.group.update({ where: { id }, data });
    else await prisma.group.create({ data });
  } catch {
    return { ok: false, error: "A group with that name already exists." };
  }
  await logAudit({ action: id ? "GROUP_UPDATE" : "GROUP_CREATE", actorUserId: session.user.id, actorEmail: session.user.email, targetType: "Group", targetId: id ?? undefined, metadata: { name, defaultRole } });
  revalidatePath("/admin/groups");
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function deleteGroup(id: string): Promise<ActionResult> {
  let session;
  try {
    session = await requireOwner();
  } catch (e) {
    return { ok: false, error: e instanceof AuthzError ? e.message : "Owner only" };
  }
  await prisma.user.updateMany({ where: { groupId: id }, data: { groupId: null } });
  await prisma.group.delete({ where: { id } });
  await logAudit({ action: "GROUP_DELETE", actorUserId: session.user.id, actorEmail: session.user.email, targetType: "Group", targetId: id });
  revalidatePath("/admin/groups");
  revalidatePath("/admin/users");
  return { ok: true };
}

// ---- Integrations (scaffold connect/disconnect) ----
export async function setIntegration(key: string, status: "connected" | "disconnected"): Promise<ActionResult> {
  let session;
  try {
    session = await requireWrite();
  } catch (e) {
    return { ok: false, error: e instanceof AuthzError ? e.message : "Unauthorized" };
  }
  const existing = await prisma.integration.findUnique({ where: { key } });
  if (!existing) return { ok: false, error: "Unknown integration." };
  await prisma.integration.update({ where: { key }, data: { status } });
  await logAudit({ action: "INTEGRATION_" + status.toUpperCase(), actorUserId: session.user.id, actorEmail: session.user.email, targetType: "Integration", targetId: key });
  revalidatePath("/admin/integrations");
  return { ok: true };
}
