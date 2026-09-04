"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { AuthzError } from "@/lib/rbac";

export type ActionResult = { ok: true } | { ok: false; error: string };

function s(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}
function bool(fd: FormData, k: string) {
  return fd.get(k) === "on" || fd.get(k) === "true";
}

export async function saveSettings(fd: FormData): Promise<ActionResult> {
  let session;
  try {
    session = await requireWrite();
  } catch (e) {
    return { ok: false, error: e instanceof AuthzError ? e.message : "Unauthorized" };
  }

  const color = s(fd, "primaryColor");
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) {
    return { ok: false, error: "Primary color must be a hex value like #4f46e5." };
  }
  const ttl = Number(fd.get("grantTtlMinutes"));

  const data = {
    companyName: s(fd, "companyName") || null,
    tagline: s(fd, "tagline") || null,
    overview: s(fd, "overview") || null,
    supportEmail: s(fd, "supportEmail") || null,
    statusPageUrl: s(fd, "statusPageUrl") || null,
    primaryColor: color || null,
    showSubprocessors: bool(fd, "showSubprocessors"),
    showKnowledge: bool(fd, "showKnowledge"),
    showUpdates: bool(fd, "showUpdates"),
    grantTtlMinutes: Number.isFinite(ttl) && ttl >= 1 && ttl <= 1440 ? Math.round(ttl) : 15,
    retentionNote: s(fd, "retentionNote") || null,
  };

  await prisma.orgSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });

  await logAudit({
    action: "SETTINGS_UPDATE",
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    targetType: "OrgSettings",
  });

  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { ok: true };
}
