"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/session";
import { putObject, deleteObject } from "@/lib/storage";
import { documentSchema } from "@/lib/validation";
import { logAudit } from "@/lib/audit";
import { AuthzError } from "@/lib/rbac";

export type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_BYTES = 40 * 1024 * 1024; // 40 MB

function fieldsFromForm(fd: FormData) {
  return {
    title: String(fd.get("title") ?? ""),
    description: String(fd.get("description") ?? ""),
    category: String(fd.get("category") ?? ""),
    visibility: String(fd.get("visibility") ?? ""),
    version: String(fd.get("version") ?? ""),
    isPublished: fd.get("isPublished") === "on" || fd.get("isPublished") === "true",
    ndaTemplateId: String(fd.get("ndaTemplateId") ?? ""),
  };
}

export async function createDocument(fd: FormData): Promise<ActionResult> {
  let session;
  try {
    session = await requireWrite();
  } catch (e) {
    return { ok: false, error: e instanceof AuthzError ? e.message : "Unauthorized" };
  }

  const parsed = documentSchema.safeParse(fieldsFromForm(fd));
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { ok: false, error: first ?? "Invalid input" };
  }
  const data = parsed.data;

  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please attach a file" };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "File exceeds 40 MB" };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
  const storageKey = `documents/${nanoid(16)}-${safeName}`;
  await putObject(storageKey, buf, file.type || "application/octet-stream");

  const doc = await prisma.document.create({
    data: {
      title: data.title,
      description: data.description || null,
      category: data.category,
      visibility: data.visibility,
      version: data.version || "1.0",
      isPublished: Boolean(data.isPublished),
      ndaTemplateId:
        data.visibility === "PRIVATE" && data.ndaTemplateId
          ? data.ndaTemplateId
          : null,
      storageKey,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: buf.length,
      createdById: session.user.id,
    },
  });

  await logAudit({
    action: "DOCUMENT_CREATE",
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    targetType: "Document",
    targetId: doc.id,
    metadata: { title: doc.title, visibility: doc.visibility },
  });

  revalidatePath("/admin/documents");
  revalidatePath("/");
  return { ok: true };
}

export async function updateDocument(
  id: string,
  fd: FormData,
): Promise<ActionResult> {
  let session;
  try {
    session = await requireWrite();
  } catch (e) {
    return { ok: false, error: e instanceof AuthzError ? e.message : "Unauthorized" };
  }

  const existing = await prisma.document.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Document not found" };

  const parsed = documentSchema.safeParse(fieldsFromForm(fd));
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
    return { ok: false, error: first ?? "Invalid input" };
  }
  const data = parsed.data;

  let storageKey = existing.storageKey;
  let fileName = existing.fileName;
  let mimeType = existing.mimeType;
  let sizeBytes = existing.sizeBytes;

  const file = fd.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) return { ok: false, error: "File exceeds 40 MB" };
    const buf = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-");
    storageKey = `documents/${nanoid(16)}-${safeName}`;
    await putObject(storageKey, buf, file.type || "application/octet-stream");
    fileName = file.name;
    mimeType = file.type || "application/octet-stream";
    sizeBytes = buf.length;
    await deleteObject(existing.storageKey).catch(() => {});
  }

  await prisma.document.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description || null,
      category: data.category,
      visibility: data.visibility,
      version: data.version || existing.version,
      isPublished: Boolean(data.isPublished),
      ndaTemplateId:
        data.visibility === "PRIVATE" && data.ndaTemplateId
          ? data.ndaTemplateId
          : null,
      storageKey,
      fileName,
      mimeType,
      sizeBytes,
    },
  });

  await logAudit({
    action: "DOCUMENT_UPDATE",
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    targetType: "Document",
    targetId: id,
    metadata: { title: data.title },
  });

  revalidatePath("/admin/documents");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  let session;
  try {
    session = await requireWrite();
  } catch (e) {
    return { ok: false, error: e instanceof AuthzError ? e.message : "Unauthorized" };
  }

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { _count: { select: { requests: true } } },
  });
  if (!doc) return { ok: false, error: "Document not found" };
  if (doc._count.requests > 0) {
    return {
      ok: false,
      error:
        "This document has request history in the immutable ledger. Unpublish it instead of deleting.",
    };
  }

  await deleteObject(doc.storageKey).catch(() => {});
  await prisma.document.delete({ where: { id } });

  await logAudit({
    action: "DOCUMENT_DELETE",
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    targetType: "Document",
    targetId: id,
    metadata: { title: doc.title },
  });

  revalidatePath("/admin/documents");
  revalidatePath("/");
  return { ok: true };
}
