"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/permissions";
import { AuthzError } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { runChart as compute, isValidDimension, datasetDef, CHART_TYPES, type ChartRow } from "@/lib/metrics";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type PreviewResult = { ok: true; rows: ChartRow[] } | { ok: false; error: string };

async function guard(need: "view" | "edit") {
  try {
    return await requireModule("metrics", need);
  } catch (e) {
    return e instanceof AuthzError ? e : new AuthzError();
  }
}

// Live preview for the query builder.
export async function previewChart(dataset: string, dimension: string, from?: string, to?: string): Promise<PreviewResult> {
  const g = await guard("view");
  if (g instanceof Error) return { ok: false, error: g.message };
  if (!datasetDef(dataset) || !isValidDimension(dataset, dimension)) return { ok: false, error: "Unknown dataset or dimension." };
  const rows = await compute(dataset, dimension, { from, to });
  return { ok: true, rows };
}

export async function saveChart(input: {
  name: string;
  dataset: string;
  dimension: string;
  chartType: string;
  from?: string;
  to?: string;
}): Promise<ActionResult> {
  const g = await guard("edit");
  if (g instanceof Error) return { ok: false, error: g.message };
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Give the chart a name." };
  if (!datasetDef(input.dataset) || !isValidDimension(input.dataset, input.dimension)) return { ok: false, error: "Unknown dataset or dimension." };
  const chartType = CHART_TYPES.some((c) => c.key === input.chartType) ? input.chartType : "bar";
  const max = await prisma.savedChart.aggregate({ _max: { sortOrder: true } });
  await prisma.savedChart.create({
    data: {
      name: name.slice(0, 120),
      dataset: input.dataset,
      dimension: input.dimension,
      chartType,
      filters: { from: input.from ?? null, to: input.to ?? null },
      sortOrder: (max._max.sortOrder ?? 0) + 1,
      createdById: g.user.id,
    },
  });
  await logAudit({ action: "CHART_CREATE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "SavedChart", metadata: { name, dataset: input.dataset, dimension: input.dimension } });
  revalidatePath("/admin/metrics");
  return { ok: true };
}

export async function deleteChart(id: string): Promise<ActionResult> {
  const g = await guard("edit");
  if (g instanceof Error) return { ok: false, error: g.message };
  await prisma.savedChart.delete({ where: { id } });
  await logAudit({ action: "CHART_DELETE", actorUserId: g.user.id, actorEmail: g.user.email, targetType: "SavedChart", targetId: id });
  revalidatePath("/admin/metrics");
  return { ok: true };
}
