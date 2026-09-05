"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/permissions";
import { AuthzError } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function guard() {
  try {
    return await requireModule("answers", "edit");
  } catch (e) {
    return e instanceof AuthzError ? e : new AuthzError();
  }
}

function s(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

export async function saveAnswer(id: string | null, fd: FormData): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const question = s(fd, "question");
  const answer = s(fd, "answer");
  if (!question || !answer) return { ok: false, error: "Question and answer are required." };
  const tags = s(fd, "tags").split(",").map((t) => t.trim()).filter(Boolean);
  const data = {
    question,
    answer,
    category: s(fd, "category") || "General",
    tags,
    ownerEmail: s(fd, "ownerEmail") || null,
    confidence: ["high", "medium", "low"].includes(s(fd, "confidence")) ? s(fd, "confidence") : "high",
    isPublished: fd.has("isPublished") ? fd.get("isPublished") === "on" || fd.get("isPublished") === "true" : true,
    lastReviewedAt: new Date(),
  };
  if (id) await prisma.answerLibraryEntry.update({ where: { id }, data });
  else {
    const max = await prisma.answerLibraryEntry.aggregate({ _max: { sortOrder: true } });
    await prisma.answerLibraryEntry.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
  }
  await logAudit({ action: id ? "ANSWER_UPDATE" : "ANSWER_CREATE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "AnswerLibraryEntry", targetId: id ?? undefined, metadata: { question: question.slice(0, 80) } });
  revalidatePath("/admin/answers");
  return { ok: true };
}

export async function deleteAnswer(id: string): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  await prisma.answerLibraryEntry.delete({ where: { id } });
  await logAudit({ action: "ANSWER_DELETE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "AnswerLibraryEntry", targetId: id });
  revalidatePath("/admin/answers");
  return { ok: true };
}
