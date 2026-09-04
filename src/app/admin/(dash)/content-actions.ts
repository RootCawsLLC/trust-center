"use server";

import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { AuthzError } from "@/lib/rbac";
import { sanitizeRichText } from "@/lib/sanitize";
import { putObject } from "@/lib/storage";

export type ActionResult = { ok: true } | { ok: false; error: string };

const MAX_UPLOAD = 25 * 1024 * 1024; // 25 MB

// Store an uploaded file from a form field, returning its storage key + name.
async function storeFile(
  fd: FormData,
  field: string,
  prefix: string,
): Promise<{ key: string; name: string; mime: string } | null> {
  const f = fd.get(field);
  if (!(f instanceof File) || f.size === 0) return null;
  if (f.size > MAX_UPLOAD) throw new Error("File exceeds 25 MB.");
  const buf = Buffer.from(await f.arrayBuffer());
  const safeName = f.name.replace(/[^\w.\- ]+/g, "_").slice(0, 200);
  const key = `${prefix}/${nanoid(16)}-${safeName}`;
  await putObject(key, buf, f.type || "application/octet-stream");
  return { key, name: safeName, mime: f.type || "application/octet-stream" };
}

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

// ---- Subprocessor import (.xlsx / .csv / .docx) ----
export type ParsedSub = { name: string; purpose: string; location: string; website: string };

function parseCsv(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .map((line) => {
      const out: string[] = [];
      let cur = "";
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
          else inQ = !inQ;
        } else if (c === "," && !inQ) { out.push(cur.trim()); cur = ""; }
        else cur += c;
      }
      out.push(cur.trim());
      return out;
    });
}

function rowsToSubs(rows: string[][]): ParsedSub[] {
  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.toLowerCase());
  const looksLikeHeader = header.some((h) => /name|purpose|location|vendor|website|url/.test(h));
  let idx = { name: 0, purpose: 1, location: 2, website: 3 };
  let body = rows;
  if (looksLikeHeader) {
    const find = (re: RegExp, d: number) => {
      const i = header.findIndex((h) => re.test(h));
      return i === -1 ? d : i;
    };
    idx = {
      name: find(/name|vendor|subprocessor/, 0),
      purpose: find(/purpose|service|use/, 1),
      location: find(/location|region|country/, 2),
      website: find(/website|url|site|domain/, 3),
    };
    body = rows.slice(1);
  }
  return body
    .map((r) => ({
      name: (r[idx.name] ?? "").slice(0, 200),
      purpose: (r[idx.purpose] ?? "").slice(0, 400),
      location: (r[idx.location] ?? "").slice(0, 200),
      website: (r[idx.website] ?? "").slice(0, 300),
    }))
    .filter((s) => s.name.length > 0);
}

export async function parseSubprocessorFile(
  fd: FormData,
): Promise<{ ok: true; rows: ParsedSub[]; note: string } | { ok: false; error: string }> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const f = fd.get("file");
  if (!(f instanceof File) || f.size === 0) return { ok: false, error: "Choose a file to import." };
  if (f.size > MAX_UPLOAD) return { ok: false, error: "File exceeds 25 MB." };
  const buf = Buffer.from(await f.arrayBuffer());
  const ext = f.name.toLowerCase().split(".").pop();
  try {
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
      rows = parseCsv(buf.toString("utf8"));
    } else if (ext === "docx") {
      const mammoth = await import("mammoth");
      const { value } = await mammoth.extractRawText({ buffer: buf });
      rows = value
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => l.split(/\t|\s{2,}|\s*\|\s*/).map((s) => s.trim()));
    } else {
      return { ok: false, error: "Unsupported file. Use .xlsx, .csv, or .docx." };
    }
    const parsed = rowsToSubs(rows);
    if (parsed.length === 0)
      return { ok: false, error: "No rows found. Expected columns: Name, Purpose, Location, Website." };
    return { ok: true, rows: parsed, note: `${parsed.length} row(s) parsed — review and import.` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not parse the file." };
  }
}

export async function importSubprocessors(rows: ParsedSub[]): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const clean = rows.filter((r) => r.name.trim()).slice(0, 500);
  if (clean.length === 0) return { ok: false, error: "Nothing to import." };
  const base = await prisma.subprocessor.count();
  await prisma.subprocessor.createMany({
    data: clean.map((r, i) => ({
      name: r.name.trim(),
      purpose: r.purpose.trim() || "—",
      location: r.location.trim() || "—",
      website: r.website.trim() || null,
      sortOrder: base + i,
    })),
  });
  await logAudit({
    action: "SUBPROCESSOR_IMPORT",
    actorUserId: g.user.id,
    actorEmail: g.user.email,
    targetType: "Subprocessor",
    metadata: { count: clean.length },
  });
  revalidatePath("/admin/subprocessors");
  revalidatePath("/");
  return { ok: true };
}

// ---- Certifications (badge detail pages) ----
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export async function saveCertification(id: string | null, fd: FormData): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const framework = s(fd, "framework");
  if (!framework) return { ok: false, error: "Framework name is required (e.g. SOC 2)." };
  const summaryHtml = sanitizeRichText(s(fd, "summaryHtml"));
  const productsInScope = s(fd, "productsInScope")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const data = {
    framework,
    slug: slugify(framework),
    displayName: s(fd, "displayName") || framework,
    summaryHtml: summaryHtml || null,
    status: s(fd, "status") || "Certified",
    productsInScope,
    sortOrder: num(fd, "sortOrder"),
    isPublished: fd.has("isPublished") ? bool(fd, "isPublished") : true,
  };
  try {
    if (id) await prisma.certification.update({ where: { id }, data });
    else await prisma.certification.create({ data });
  } catch {
    return { ok: false, error: "A certification with that framework already exists." };
  }
  await logAudit({
    action: id ? "CERT_UPDATE" : "CERT_CREATE",
    actorUserId: g.user.id,
    actorEmail: g.user.email,
    targetType: "Certification",
    targetId: id ?? undefined,
    metadata: { framework },
  });
  revalidatePath("/admin/certifications");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCertification(id: string): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  await prisma.certification.delete({ where: { id } });
  await logAudit({ action: "CERT_DELETE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "Certification", targetId: id });
  revalidatePath("/admin/certifications");
  revalidatePath("/");
  return { ok: true };
}

// ---- Risk profile ----
export async function saveRiskItem(id: string | null, fd: FormData): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const label = s(fd, "label");
  const value = s(fd, "value");
  if (!label || !value) return { ok: false, error: "Label and value are required." };
  const data = {
    category: s(fd, "category") || "General",
    label,
    value,
    sortOrder: num(fd, "sortOrder"),
    isPublished: fd.has("isPublished") ? bool(fd, "isPublished") : true,
  };
  if (id) await prisma.riskProfileItem.update({ where: { id }, data });
  else await prisma.riskProfileItem.create({ data });
  await logAudit({ action: id ? "RISK_UPDATE" : "RISK_CREATE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "RiskProfileItem", targetId: id ?? undefined, metadata: { label } });
  revalidatePath("/admin/risk-profile");
  revalidatePath("/");
  return { ok: true };
}
export async function deleteRiskItem(id: string): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  await prisma.riskProfileItem.delete({ where: { id } });
  await logAudit({ action: "RISK_DELETE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "RiskProfileItem", targetId: id });
  revalidatePath("/admin/risk-profile");
  revalidatePath("/");
  return { ok: true };
}

// ---- Shared responsibility / RACI ----
export async function saveRaci(id: string | null, fd: FormData): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const area = s(fd, "area");
  if (!area) return { ok: false, error: "Responsibility area is required." };
  const data = {
    area,
    corporate: s(fd, "corporate"),
    product: s(fd, "product"),
    customer: s(fd, "customer"),
    note: s(fd, "note") || null,
    sortOrder: num(fd, "sortOrder"),
    isPublished: fd.has("isPublished") ? bool(fd, "isPublished") : true,
  };
  if (id) await prisma.raciItem.update({ where: { id }, data });
  else await prisma.raciItem.create({ data });
  await logAudit({ action: id ? "RACI_UPDATE" : "RACI_CREATE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "RaciItem", targetId: id ?? undefined, metadata: { area } });
  revalidatePath("/admin/shared-responsibility");
  revalidatePath("/");
  return { ok: true };
}
export async function deleteRaci(id: string): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  await prisma.raciItem.delete({ where: { id } });
  await logAudit({ action: "RACI_DELETE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "RaciItem", targetId: id });
  revalidatePath("/admin/shared-responsibility");
  revalidatePath("/");
  return { ok: true };
}

// ---- Compliance calendar ----
export async function saveEvent(id: string | null, fd: FormData): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const title = s(fd, "title");
  const window = s(fd, "window");
  if (!title || !window) return { ok: false, error: "Title and window are required." };
  const data = {
    title,
    detail: s(fd, "detail") || null,
    framework: s(fd, "framework") || null,
    product: s(fd, "product") || null,
    window,
    status: s(fd, "status") || "planned",
    sortOrder: num(fd, "sortOrder"),
    isPublished: fd.has("isPublished") ? bool(fd, "isPublished") : true,
  };
  if (id) await prisma.complianceEvent.update({ where: { id }, data });
  else await prisma.complianceEvent.create({ data });
  await logAudit({ action: id ? "EVENT_UPDATE" : "EVENT_CREATE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "ComplianceEvent", targetId: id ?? undefined, metadata: { title } });
  revalidatePath("/admin/compliance-calendar");
  revalidatePath("/");
  return { ok: true };
}
export async function deleteEvent(id: string): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  await prisma.complianceEvent.delete({ where: { id } });
  await logAudit({ action: "EVENT_DELETE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "ComplianceEvent", targetId: id });
  revalidatePath("/admin/compliance-calendar");
  revalidatePath("/");
  return { ok: true };
}

// ---- Knowledge base ----
export async function saveArticle(id: string | null, fd: FormData): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const title = s(fd, "title");
  if (!title) return { ok: false, error: "Title is required." };
  const contentHtml = sanitizeRichText(s(fd, "contentHtml"));
  const url = s(fd, "url") || null;
  let file: Awaited<ReturnType<typeof storeFile>> = null;
  try {
    file = await storeFile(fd, "file", "kb");
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed." };
  }
  const hasBody = contentHtml.replace(/<[^>]*>/g, "").trim().length > 0;
  if (!hasBody && !url && !file && !(id && s(fd, "hasExistingFile") === "1")) {
    return { ok: false, error: "Provide a body, a URL, or an uploaded file." };
  }
  const data = {
    title,
    category: s(fd, "category") || "General",
    bodyMarkdown: s(fd, "bodyMarkdown"),
    contentHtml: contentHtml || null,
    url,
    sortOrder: num(fd, "sortOrder"),
    isPublished: fd.has("isPublished") ? bool(fd, "isPublished") : true,
    ...(file ? { fileStorageKey: file.key, fileName: file.name } : {}),
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
  const contentHtml = sanitizeRichText(s(fd, "contentHtml"));
  const hasBody = contentHtml.replace(/<[^>]*>/g, "").trim().length > 0;
  if (!title || !hasBody) return { ok: false, error: "Title and body are required." };
  const dateStr = s(fd, "publishedAt");
  const data = {
    title,
    bodyMarkdown: s(fd, "bodyMarkdown"),
    contentHtml: contentHtml || null,
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
