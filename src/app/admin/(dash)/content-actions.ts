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

function s(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}
function bool(fd: FormData, k: string) {
  return fd.get(k) === "on" || fd.get(k) === "true";
}
function num(fd: FormData, k: string) {
  const n = Number(fd.get(k));
  return Number.isFinite(n) ? n : 0;
}

// ---- Subprocessors ----
export async function saveSubprocessor(id: string | null, fd: FormData): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const name = s(fd, "name");
  const purpose = s(fd, "purpose");
  const location = s(fd, "location");
  if (!name || !purpose || !location) return { ok: false, error: "Name, purpose, and location are required." };
  const data = {
    name,
    purpose,
    location,
    website: s(fd, "website") || null,
    sortOrder: num(fd, "sortOrder"),
    isActive: fd.has("isActive") ? bool(fd, "isActive") : true,
  };
  if (id) await prisma.subprocessor.update({ where: { id }, data });
  else await prisma.subprocessor.create({ data });
  await logAudit({ action: id ? "SUBPROCESSOR_UPDATE" : "SUBPROCESSOR_CREATE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "Subprocessor", targetId: id ?? undefined, metadata: { name } });
  revalidatePath("/admin/subprocessors");
  revalidatePath("/");
  return { ok: true };
}
export async function deleteSubprocessor(id: string): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  await prisma.subprocessor.delete({ where: { id } });
  await logAudit({ action: "SUBPROCESSOR_DELETE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "Subprocessor", targetId: id });
  revalidatePath("/admin/subprocessors");
  revalidatePath("/");
  return { ok: true };
}

// ---- Knowledge base ----
export async function saveArticle(id: string | null, fd: FormData): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const title = s(fd, "title");
  const bodyMarkdown = s(fd, "bodyMarkdown");
  if (!title || bodyMarkdown.length < 10) return { ok: false, error: "Title and a body (10+ chars) are required." };
  const data = {
    title,
    category: s(fd, "category") || "General",
    bodyMarkdown,
    sortOrder: num(fd, "sortOrder"),
    isPublished: fd.has("isPublished") ? bool(fd, "isPublished") : true,
  };
  if (id) await prisma.knowledgeArticle.update({ where: { id }, data });
  else await prisma.knowledgeArticle.create({ data });
  await logAudit({ action: id ? "ARTICLE_UPDATE" : "ARTICLE_CREATE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "KnowledgeArticle", targetId: id ?? undefined, metadata: { title } });
  revalidatePath("/admin/knowledge");
  revalidatePath("/");
  return { ok: true };
}
export async function deleteArticle(id: string): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  await prisma.knowledgeArticle.delete({ where: { id } });
  await logAudit({ action: "ARTICLE_DELETE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "KnowledgeArticle", targetId: id });
  revalidatePath("/admin/knowledge");
  revalidatePath("/");
  return { ok: true };
}

// ---- Updates ----
export async function saveUpdate(id: string | null, fd: FormData): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const title = s(fd, "title");
  const bodyMarkdown = s(fd, "bodyMarkdown");
  if (!title || bodyMarkdown.length < 5) return { ok: false, error: "Title and body are required." };
  const dateStr = s(fd, "publishedAt");
  const data = {
    title,
    bodyMarkdown,
    type: s(fd, "type") || "update",
    isPublished: fd.has("isPublished") ? bool(fd, "isPublished") : true,
    ...(dateStr ? { publishedAt: new Date(dateStr) } : {}),
  };
  if (id) await prisma.trustUpdate.update({ where: { id }, data });
  else await prisma.trustUpdate.create({ data });
  await logAudit({ action: id ? "UPDATE_UPDATE" : "UPDATE_CREATE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "TrustUpdate", targetId: id ?? undefined, metadata: { title } });
  revalidatePath("/admin/updates");
  revalidatePath("/");
  return { ok: true };
}
export async function deleteUpdate(id: string): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  await prisma.trustUpdate.delete({ where: { id } });
  await logAudit({ action: "UPDATE_DELETE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "TrustUpdate", targetId: id });
  revalidatePath("/admin/updates");
  revalidatePath("/");
  return { ok: true };
}
