"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { AuthzError } from "@/lib/rbac";
import { requireModule } from "@/lib/permissions";
import { taxonomyDef } from "@/lib/taxonomy";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function guard() {
  try {
    return await requireModule("attributes", "edit");
  } catch (e) {
    return e instanceof AuthzError ? e : new AuthzError();
  }
}

// Add or rename an option in a taxonomy. `id` null = create.
export async function saveOption(
  id: string | null,
  taxonomy: string,
  value: string,
  isActive: boolean,
): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  if (!taxonomyDef(taxonomy)) return { ok: false, error: "Unknown attribute set." };
  const v = value.trim();
  if (!v) return { ok: false, error: "Value is required." };

  // Guard the unique (taxonomy, value) constraint with a friendly message.
  const clash = await prisma.taxonomyOption.findFirst({
    where: { taxonomy, value: v, ...(id ? { NOT: { id } } : {}) },
    select: { id: true },
  });
  if (clash) return { ok: false, error: `"${v}" already exists in this set.` };

  if (id) {
    await prisma.taxonomyOption.update({ where: { id }, data: { value: v, isActive } });
  } else {
    const max = await prisma.taxonomyOption.aggregate({ where: { taxonomy }, _max: { sortOrder: true } });
    await prisma.taxonomyOption.create({
      data: { taxonomy, value: v, isActive, sortOrder: (max._max.sortOrder ?? 0) + 1 },
    });
  }
  await logAudit({
    action: id ? "ATTRIBUTE_UPDATE" : "ATTRIBUTE_CREATE",
    actorUserId: g.user.id,
    actorEmail: g.user.email,
    targetType: "TaxonomyOption",
    targetId: id ?? undefined,
    metadata: { taxonomy, value: v },
  });
  revalidatePath("/admin/attributes");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteOption(id: string): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  const row = await prisma.taxonomyOption.findUnique({ where: { id } });
  if (!row) return { ok: false, error: "Option not found." };
  await prisma.taxonomyOption.delete({ where: { id } });
  await logAudit({
    action: "ATTRIBUTE_DELETE",
    actorUserId: g.user.id,
    actorEmail: g.user.email,
    targetType: "TaxonomyOption",
    targetId: id,
    metadata: { taxonomy: row.taxonomy, value: row.value },
  });
  revalidatePath("/admin/attributes");
  revalidatePath("/");
  return { ok: true };
}

// Persist a new drag-and-drop order: orderedIds are the option ids in the
// desired top-to-bottom order for a single taxonomy.
export async function reorderOptions(taxonomy: string, orderedIds: string[]): Promise<ActionResult> {
  const g = await guard();
  if (g instanceof Error) return { ok: false, error: g.message };
  await prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.taxonomyOption.updateMany({ where: { id, taxonomy }, data: { sortOrder: i + 1 } }),
    ),
  );
  await logAudit({
    action: "ATTRIBUTE_REORDER",
    actorUserId: g.user.id,
    actorEmail: g.user.email,
    targetType: "Taxonomy",
    targetId: taxonomy,
    metadata: { count: orderedIds.length },
  });
  revalidatePath("/admin/attributes");
  revalidatePath("/");
  return { ok: true };
}
