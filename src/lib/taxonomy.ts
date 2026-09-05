import { prisma } from "@/lib/prisma";
import { FRAMEWORKS, INDUSTRIES, REGIONS, KB_CATEGORIES } from "@/lib/constants";

// The Attribute Manager registry. Each entry is one admin-managed controlled
// vocabulary: a stable `key` (stored in TaxonomyOption.taxonomy), a human label,
// a grouping for the UI, and the default `seed` values used both to populate the
// table on first seed and as a fallback if the table is somehow empty.
export type TaxonomyDef = {
  key: string;
  label: string;
  group: string;
  seed: readonly string[];
  hint?: string;
};

export const TAXONOMIES: TaxonomyDef[] = [
  { key: "document.framework", label: "Frameworks", group: "Documents", seed: FRAMEWORKS, hint: "Compliance frameworks a document can be tagged with." },
  { key: "document.industry", label: "Industries", group: "Documents", seed: INDUSTRIES },
  { key: "document.region", label: "Regions", group: "Documents", seed: REGIONS },
  { key: "risk.category", label: "Risk categories", group: "Risk profile", seed: ["Resilience", "Data protection", "Access control", "Infrastructure", "Governance", "Reputation"] },
  { key: "raci.area", label: "Responsibility areas", group: "Shared responsibility", seed: ["Physical & infrastructure security", "Data encryption", "Identity & access management", "Application security", "Configuration & patching", "Incident response", "Business continuity"] },
  { key: "compliance.framework", label: "Frameworks", group: "Compliance calendar", seed: FRAMEWORKS },
  { key: "compliance.product", label: "Products", group: "Compliance calendar", seed: ["Platform", "GovCloud", "EU Region", "Mobile"] },
  { key: "certification.framework", label: "Frameworks", group: "Certifications", seed: FRAMEWORKS },
  { key: "knowledge.category", label: "Categories", group: "FAQ", seed: KB_CATEGORIES },
];

const REGISTRY = new Map(TAXONOMIES.map((t) => [t.key, t]));

export function taxonomyDef(key: string): TaxonomyDef | undefined {
  return REGISTRY.get(key);
}

/**
 * Active option values for a taxonomy, ordered. Falls back to the registered
 * seed list when the table has no rows yet for this key, so forms never render
 * an empty dropdown even before the seed runs.
 */
export async function getTaxonomyOptions(key: string): Promise<string[]> {
  const rows = await prisma.taxonomyOption.findMany({
    where: { taxonomy: key, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
    select: { value: true },
  });
  if (rows.length > 0) return rows.map((r) => r.value);
  return [...(REGISTRY.get(key)?.seed ?? [])];
}

/** Batch helper: resolve several taxonomies at once. */
export async function getTaxonomies(keys: string[]): Promise<Record<string, string[]>> {
  const entries = await Promise.all(keys.map(async (k) => [k, await getTaxonomyOptions(k)] as const));
  return Object.fromEntries(entries);
}

/** {value,label}[] shape for ContentManager select fields. */
export async function getTaxonomySelectOptions(key: string): Promise<{ value: string; label: string }[]> {
  const values = await getTaxonomyOptions(key);
  return values.map((v) => ({ value: v, label: v }));
}
