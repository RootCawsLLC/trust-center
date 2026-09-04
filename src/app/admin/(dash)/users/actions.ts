"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/session";
import { userSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { AuthzError } from "@/lib/rbac";
import type { Role } from "@prisma/client";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function guard() {
  try {
    return await requireOwner();
  } catch (e) {
    throw e instanceof AuthzError ? e : new AuthzError();
  }
}

export async function createUser(fd: FormData): Promise<ActionResult> {
  let session;
  try {
    session = await guard();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unauthorized" };
  }

  const parsed = userSchema.safeParse({
    email: String(fd.get("email") ?? ""),
    name: String(fd.get("name") ?? ""),
    role: String(fd.get("role") ?? "VIEWER"),
    password: String(fd.get("password") ?? ""),
  });
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { ok: false, error: first ?? "Invalid input" };
  }
  const data = parsed.data;
  const email = data.email.toLowerCase();

  if (!data.password) {
    return { ok: false, error: "A password is required for a new account" };
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "A user with that email already exists" };

  const groupId = String(fd.get("groupId") ?? "") || null;
  const user = await prisma.user.create({
    data: {
      email,
      name: data.name,
      role: data.role as Role,
      groupId,
      passwordHash: await bcrypt.hash(data.password, 12),
      isActive: true,
    },
  });

  await logAudit({
    action: "USER_CREATE",
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    targetType: "User",
    targetId: user.id,
    metadata: { email, role: data.role, groupId },
  });

  // Welcome email — scaffolded: recorded here; a real deploy sends it via SES.
  await logAudit({
    action: "WELCOME_EMAIL_QUEUED",
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    targetType: "User",
    targetId: user.id,
    metadata: { to: email, note: "Scaffold — no email sent (wire SES for UAT)" },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function updateUser(id: string, fd: FormData): Promise<ActionResult> {
  let session;
  try {
    session = await guard();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unauthorized" };
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { ok: false, error: "User not found" };

  const name = String(fd.get("name") ?? target.name ?? "");
  const role = String(fd.get("role") ?? target.role) as Role;
  const isActive = fd.get("isActive") === "on" || fd.get("isActive") === "true";
  const password = String(fd.get("password") ?? "");

  // Guardrails: you cannot demote or deactivate your own account, and you
  // cannot remove the last active owner.
  if (id === session.user.id && (role !== "OWNER" || !isActive)) {
    return { ok: false, error: "You cannot demote or deactivate your own account." };
  }
  if (target.role === "OWNER" && (role !== "OWNER" || !isActive)) {
    const owners = await prisma.user.count({
      where: { role: "OWNER", isActive: true },
    });
    if (owners <= 1) {
      return { ok: false, error: "There must be at least one active owner." };
    }
  }

  await prisma.user.update({
    where: { id },
    data: {
      name,
      role,
      isActive,
      groupId: String(fd.get("groupId") ?? "") || null,
      ...(password
        ? { passwordHash: await bcrypt.hash(password, 12) }
        : {}),
    },
  });

  await logAudit({
    action: "USER_UPDATE",
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    targetType: "User",
    targetId: id,
    metadata: { role, isActive, passwordReset: Boolean(password) },
  });

  revalidatePath("/admin/users");
  return { ok: true };
}
