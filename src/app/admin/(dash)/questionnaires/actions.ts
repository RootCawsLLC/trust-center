"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/permissions";
import { AuthzError } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { draftAnswers } from "@/lib/answers";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const MAX_UPLOAD = 15 * 1024 * 1024;

async function guard() {
  try {
    return await requireModule("questionnaires", "edit");
  } catch (e) {
    return e instanceof AuthzError ? e : new AuthzError();
  }
}

// Pull questions out of an uploaded xlsx/csv (first column, or a column whose
// header looks like "question"), or from pasted text (one per line).
async function extractQuestions(fd: FormData): Promise<string[]> {
  const pasted = String(fd.get("questions") ?? "").trim();
  if (pasted) {
    return pasted.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 3).slice(0, 300);
  }
  const f = fd.get("file");
  if (!(f instanceof File) || f.size === 0) return [];
  if (f.size > MAX_UPLOAD) throw new Error("File exceeds 15 MB.");
  const buf = Buffer.from(await f.arrayBuffer());
  const ext = f.name.toLowerCase().split(".").pop();
  let rows: string[][] = [];
  if (ext === "xlsx" || ext === "xls") {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.worksheets[0];
    ws?.eachRow((row) => {
      const vals = (row.values as unknown[]).slice(1).map((v) => (v == null ? "" : String(v).trim()));
      rows.push(vals);
    });
  } else if (ext === "csv") {
    rows = buf.toString("utf8").split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split(",").map((c) => c.replace(/^"|"$/g, "").trim()));
  } else {
    throw new Error("Unsupported file. Use .xlsx or .csv, or paste the questions.");
  }
  if (rows.length === 0) return [];
  // Find a "question" column, else use the first non-empty column.
  const header = rows[0].map((h) => h.toLowerCase());
  let col = header.findIndex((h) => /question|item|control|requirement/.test(h));
  let body = rows;
  if (col >= 0) body = rows.slice(1);
  else col = 0;
  return body.map((r) => (r[col] ?? "").trim()).filter((q) => q.length > 3).slice(0, 300);
}

export async function createQuestionnaire(fd: FormData): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const name = String(fd.get("name") ?? "").trim() || "Untitled questionnaire";
  let questions: string[];
  try {
    questions = await extractQuestions(fd);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not read the questions." };
  }
  if (questions.length === 0) return { ok: false, error: "No questions found. Paste them or upload a .xlsx/.csv." };

  const drafts = await draftAnswers(questions);
  const q = await prisma.questionnaire.create({
    data: {
      name: name.slice(0, 200),
      requesterName: String(fd.get("requesterName") ?? "").trim() || null,
      requesterEmail: String(fd.get("requesterEmail") ?? "").trim().toLowerCase() || null,
      createdById: g.user.id,
      items: {
        create: questions.map((question, i) => ({
          rowIndex: i,
          question: question.slice(0, 2000),
          draftAnswer: drafts[i].answer,
          finalAnswer: drafts[i].answer,
          matchedEntryId: drafts[i].entryId,
          confidence: drafts[i].confidence,
          status: "draft",
        })),
      },
    },
  });
  await logAudit({ action: "QUESTIONNAIRE_CREATE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "Questionnaire", targetId: q.id, metadata: { name, questions: questions.length } });
  revalidatePath("/admin/questionnaires");
  return { ok: true, id: q.id };
}

export async function updateItem(id: string, fields: { finalAnswer?: string; status?: string }): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const data: Record<string, unknown> = {};
  if (fields.finalAnswer !== undefined) data.finalAnswer = fields.finalAnswer.slice(0, 4000);
  if (fields.status && ["draft", "approved", "skipped"].includes(fields.status)) data.status = fields.status;
  const item = await prisma.questionnaireItem.update({ where: { id }, data, select: { questionnaireId: true } });
  revalidatePath(`/admin/questionnaires/${item.questionnaireId}`);
  return { ok: true };
}

// Re-run the library matcher for one item (e.g. after the library changed).
export async function redraftItem(id: string): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const item = await prisma.questionnaireItem.findUnique({ where: { id } });
  if (!item) return { ok: false, error: "Item not found." };
  const [draft] = await draftAnswers([item.question]);
  await prisma.questionnaireItem.update({
    where: { id },
    data: { draftAnswer: draft.answer, finalAnswer: draft.answer, matchedEntryId: draft.entryId, confidence: draft.confidence, status: "draft" },
  });
  revalidatePath(`/admin/questionnaires/${item.questionnaireId}`);
  return { ok: true };
}

export async function setQuestionnaireStatus(id: string, status: string): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  await prisma.questionnaire.update({ where: { id }, data: { status: status === "complete" ? "complete" : "in-progress" } });
  revalidatePath(`/admin/questionnaires/${id}`);
  revalidatePath("/admin/questionnaires");
  return { ok: true };
}

// Write an approved questionnaire answer back into the answer library, so the
// library grows from completed questionnaires (governed: added as medium
// confidence for review, never silently). Requires answer-library edit rights.
export async function saveItemToLibrary(id: string): Promise<ActionResult> {
  let g;
  try {
    g = await requireModule("answers", "edit");
  } catch (e) {
    return { ok: false, error: e instanceof AuthzError ? e.message : "You need edit access to the answer library." };
  }
  const item = await prisma.questionnaireItem.findUnique({ where: { id } });
  if (!item) return { ok: false, error: "Item not found." };
  const answer = (item.finalAnswer ?? "").trim();
  if (!answer) return { ok: false, error: "Add an answer before saving it to the library." };
  // Skip if this exact question is already in the library.
  const existing = await prisma.answerLibraryEntry.findFirst({ where: { question: item.question } });
  if (existing) return { ok: false, error: "A library entry for this question already exists." };
  const max = await prisma.answerLibraryEntry.aggregate({ _max: { sortOrder: true } });
  const entry = await prisma.answerLibraryEntry.create({
    data: {
      question: item.question.slice(0, 2000),
      answer: answer.slice(0, 4000),
      category: "From questionnaires",
      confidence: "medium",
      ownerEmail: g.user.email,
      lastReviewedAt: new Date(),
      isPublished: true,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });
  await prisma.questionnaireItem.update({ where: { id }, data: { matchedEntryId: entry.id, confidence: "high" } });
  await logAudit({ action: "ANSWER_CREATE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "AnswerLibraryEntry", targetId: entry.id, metadata: { from: "questionnaire" } });
  revalidatePath(`/admin/questionnaires/${item.questionnaireId}`);
  revalidatePath("/admin/answers");
  return { ok: true };
}

export async function deleteQuestionnaire(id: string): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  await prisma.questionnaire.delete({ where: { id } });
  await logAudit({ action: "QUESTIONNAIRE_DELETE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "Questionnaire", targetId: id });
  revalidatePath("/admin/questionnaires");
  return { ok: true };
}
