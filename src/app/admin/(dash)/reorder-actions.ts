"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { AuthzError } from "@/lib/rbac";
import { requireModule } from "@/lib/permissions";

export type ActionResult = { ok: true } | { ok: false; error: string };

// The `section` here doubles as the module key (risk-profile, certifications…).
async function guard(moduleKey: string) {
  try {
    return await requireModule(moduleKey, "edit");
  } catch (e) {
    return e instanceof AuthzError ? e : new AuthzError();
  }
}

// Shared implementation: rewrite sortOrder to match the given top-to-bottom id
// order for one model. `apply` runs one updateMany per id inside a transaction.
async function reorder(
  section: string,
  targetType: string,
  orderedIds: string[],
  apply: (id: string, sortOrder: number) => Promise<unknown>,
): Promise<ActionResult> {
  const g = await guard(section);
  if (g instanceof Error) return { ok: false, error: g.message };
  await prisma.$transaction(orderedIds.map((id, i) => apply(id, i + 1) as never));
  await logAudit({
    action: "REORDER",
    actorUserId: g.user.id,
    actorEmail: g.user.email,
    targetType,
    metadata: { count: orderedIds.length },
  });
  revalidatePath(`/admin/${section}`);
  revalidatePath("/");
  return { ok: true };
}

export async function reorderRiskItems(orderedIds: string[]): Promise<ActionResult> {
  return reorder("risk-profile", "RiskProfileItem", orderedIds, (id, sortOrder) =>
    prisma.riskProfileItem.updateMany({ where: { id }, data: { sortOrder } }),
  );
}

export async function reorderRaci(orderedIds: string[]): Promise<ActionResult> {
  return reorder("shared-responsibility", "RaciItem", orderedIds, (id, sortOrder) =>
    prisma.raciItem.updateMany({ where: { id }, data: { sortOrder } }),
  );
}

export async function reorderEvents(orderedIds: string[]): Promise<ActionResult> {
  return reorder("compliance-calendar", "ComplianceEvent", orderedIds, (id, sortOrder) =>
    prisma.complianceEvent.updateMany({ where: { id }, data: { sortOrder } }),
  );
}

export async function reorderCertifications(orderedIds: string[]): Promise<ActionResult> {
  return reorder("certifications", "Certification", orderedIds, (id, sortOrder) =>
    prisma.certification.updateMany({ where: { id }, data: { sortOrder } }),
  );
}

export async function reorderSubprocessors(orderedIds: string[]): Promise<ActionResult> {
  return reorder("subprocessors", "Subprocessor", orderedIds, (id, sortOrder) =>
    prisma.subprocessor.updateMany({ where: { id }, data: { sortOrder } }),
  );
}

export async function reorderArticles(orderedIds: string[]): Promise<ActionResult> {
  return reorder("knowledge", "KnowledgeArticle", orderedIds, (id, sortOrder) =>
    prisma.knowledgeArticle.updateMany({ where: { id }, data: { sortOrder } }),
  );
}
