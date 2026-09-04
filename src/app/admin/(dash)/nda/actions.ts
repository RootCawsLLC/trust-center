"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/session";
import { ndaTemplateSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { AuthzError } from "@/lib/rbac";

export type ActionResult = { ok: true } | { ok: false; error: string };

function parse(fd: FormData) {
  return ndaTemplateSchema.safeParse({
    name: String(fd.get("name") ?? ""),
    bodyMarkdown: String(fd.get("bodyMarkdown") ?? ""),
    isDefault: fd.get("isDefault") === "on" || fd.get("isDefault") === "true",
    isActive: fd.get("isActive") === "on" || fd.get("isActive") === "true",
  });
}

async function guard() {
  try {
    return await requireWrite();
  } catch (e) {
    throw e instanceof AuthzError ? e : new AuthzError();
  }
}

export async function saveNda(id: string | null, fd: FormData): Promise<ActionResult> {
  let session;
  try {
    session = await guard();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unauthorized" };
  }
  const parsed = parse(fd);
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { ok: false, error: first ?? "Invalid input" };
  }
  const data = parsed.data;

  // Only one default at a time.
  if (data.isDefault) {
    await prisma.ndaTemplate.updateMany({
      where: { isDefault: true, ...(id ? { NOT: { id } } : {}) },
      data: { isDefault: false },
    });
  }

  if (id) {
    await prisma.ndaTemplate.update({
      where: { id },
      data: {
        name: data.name,
        bodyMarkdown: data.bodyMarkdown,
        isDefault: Boolean(data.isDefault),
        isActive: data.isActive ?? true,
      },
    });
  } else {
    await prisma.ndaTemplate.create({
      data: {
        name: data.name,
        bodyMarkdown: data.bodyMarkdown,
        isDefault: Boolean(data.isDefault),
        isActive: data.isActive ?? true,
      },
    });
  }

  await logAudit({
    action: id ? "NDA_TEMPLATE_UPDATE" : "NDA_TEMPLATE_CREATE",
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    targetType: "NdaTemplate",
    targetId: id ?? undefined,
    metadata: { name: data.name },
  });

  revalidatePath("/admin/nda");
  return { ok: true };
}

export async function deleteNda(id: string): Promise<ActionResult> {
  let session;
  try {
    session = await guard();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unauthorized" };
  }
  const tmpl = await prisma.ndaTemplate.findUnique({
    where: { id },
    include: { _count: { select: { documents: true, acceptances: true } } },
  });
  if (!tmpl) return { ok: false, error: "Template not found" };
  if (tmpl._count.acceptances > 0) {
    return { ok: false, error: "This template has recorded acceptances and cannot be deleted. Deactivate it instead." };
  }
  if (tmpl._count.documents > 0) {
    return { ok: false, error: "This template is assigned to documents. Reassign them first." };
  }
  await prisma.ndaTemplate.delete({ where: { id } });
  await logAudit({
    action: "NDA_TEMPLATE_DELETE",
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    targetType: "NdaTemplate",
    targetId: id,
    metadata: { name: tmpl.name },
  });
  revalidatePath("/admin/nda");
  return { ok: true };
}
