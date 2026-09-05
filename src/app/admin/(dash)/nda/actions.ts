"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { AuthzError } from "@/lib/rbac";
import { requireModule } from "@/lib/permissions";
import { sanitizeRichText, htmlToText } from "@/lib/sanitize";
import { putObject } from "@/lib/storage";

export type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_UPLOAD = 25 * 1024 * 1024; // 25 MB

async function storeNdaFile(fd: FormData): Promise<{ key: string; name: string; mime: string } | null> {
  const f = fd.get("file");
  if (!(f instanceof File) || f.size === 0) return null;
  if (f.size > MAX_UPLOAD) throw new Error("File exceeds 25 MB.");
  const buf = Buffer.from(await f.arrayBuffer());
  const safeName = f.name.replace(/[^\w.\- ]+/g, "_").slice(0, 200);
  const key = `nda/${nanoid(16)}-${safeName}`;
  await putObject(key, buf, f.type || "application/octet-stream");
  return { key, name: safeName, mime: f.type || "application/octet-stream" };
}

function parse(fd: FormData) {
  const contentHtml = sanitizeRichText(String(fd.get("contentHtml") ?? ""));
  const bodyMarkdown = htmlToText(contentHtml); // canonical plain text (hashed on acceptance)
  const name = String(fd.get("name") ?? "").trim();
  if (!name) return { success: false as const, error: "Name is required." };
  if (bodyMarkdown.length < 20)
    return { success: false as const, error: "NDA text is required (20+ characters)." };
  return {
    success: true as const,
    data: {
      name,
      contentHtml,
      bodyMarkdown,
      isDefault: fd.get("isDefault") === "on" || fd.get("isDefault") === "true",
      isActive: fd.get("isActive") === "on" || fd.get("isActive") === "true",
    },
  };
}

async function guard() {
  try {
    return await requireModule("nda", "edit");
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
    return { ok: false, error: parsed.error ?? "Invalid input" };
  }
  const data = parsed.data;

  let file: Awaited<ReturnType<typeof storeNdaFile>> = null;
  try {
    file = await storeNdaFile(fd);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }

  // Only one default at a time.
  if (data.isDefault) {
    await prisma.ndaTemplate.updateMany({
      where: { isDefault: true, ...(id ? { NOT: { id } } : {}) },
      data: { isDefault: false },
    });
  }

  const fileFields = file
    ? { fileStorageKey: file.key, fileName: file.name, fileMimeType: file.mime }
    : {};

  if (id) {
    await prisma.ndaTemplate.update({
      where: { id },
      data: {
        name: data.name,
        bodyMarkdown: data.bodyMarkdown,
        contentHtml: data.contentHtml,
        isDefault: Boolean(data.isDefault),
        isActive: data.isActive ?? true,
        ...fileFields,
      },
    });
  } else {
    await prisma.ndaTemplate.create({
      data: {
        name: data.name,
        bodyMarkdown: data.bodyMarkdown,
        contentHtml: data.contentHtml,
        isDefault: Boolean(data.isDefault),
        isActive: data.isActive ?? true,
        ...fileFields,
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
