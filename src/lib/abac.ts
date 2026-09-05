import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { Role } from "@prisma/client";

// Attribute-based access control. Attributes are dimensions (Region, Business
// unit…) whose values scope which records a user may see/act on. Scopes attach
// to groups and to individual users (user overrides group, per attribute).
// Values are drawn from the Attribute manager taxonomies so admins manage them
// in one place.
export type AbacAttribute = { key: string; label: string; taxonomy: string; enforced: boolean };

export const ABAC_ATTRIBUTES: AbacAttribute[] = [
  // Enforced today (documents + download requests carry region data).
  { key: "region", label: "Region", taxonomy: "document.region", enforced: true },
  // Assignable now; enforcement bites once records are tagged with a business unit.
  { key: "business_unit", label: "Business unit", taxonomy: "access.business_unit", enforced: false },
];

export type Scopes = Record<string, string[]>;

const ATTR_KEYS = new Set(ABAC_ATTRIBUTES.map((a) => a.key));

// Keep only known attribute keys with non-empty string-array values.
export function sanitizeScopes(input: Record<string, unknown>): Scopes {
  const out: Scopes = {};
  for (const [k, v] of Object.entries(input)) {
    if (!ATTR_KEYS.has(k) || !Array.isArray(v)) continue;
    const vals = [...new Set(v.filter((x): x is string => typeof x === "string" && x.trim() !== ""))];
    if (vals.length > 0) out[k] = vals;
  }
  return out;
}

function asScopes(v: unknown): Scopes {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Scopes = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (Array.isArray(val)) out[k] = val.filter((x): x is string => typeof x === "string");
  }
  return out;
}

/**
 * Effective attribute scope for the current user: per attribute, the user's own
 * values if any, else the group's. An empty list for an attribute means "no
 * restriction on that attribute". Owners are always unrestricted.
 */
export async function getEffectiveScopes(): Promise<{ role: Role | undefined; isOwner: boolean; scopes: Scopes }> {
  const session = await getSession();
  const role = session?.user?.role as Role | undefined;
  const isOwner = role === "OWNER";
  if (isOwner || !session?.user?.id) return { role, isOwner, scopes: {} };

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { attributeScopes: true, group: { select: { attributeScopes: true } } },
  });
  const userScopes = asScopes(user?.attributeScopes);
  const groupScopes = asScopes(user?.group?.attributeScopes);

  const scopes: Scopes = {};
  for (const attr of ABAC_ATTRIBUTES) {
    const u = userScopes[attr.key] ?? [];
    const g = groupScopes[attr.key] ?? [];
    const eff = u.length > 0 ? u : g;
    if (eff.length > 0) scopes[attr.key] = eff;
  }
  return { role, isOwner, scopes };
}

// Attribute dimensions with their selectable values (from the Attribute manager),
// for the group/user scope editors.
export async function getAbacAttributeOptions(): Promise<{ key: string; label: string; enforced: boolean; options: string[] }[]> {
  const { getTaxonomyOptions } = await import("@/lib/taxonomy");
  return Promise.all(
    ABAC_ATTRIBUTES.map(async (a) => ({ key: a.key, label: a.label, enforced: a.enforced, options: await getTaxonomyOptions(a.taxonomy) })),
  );
}

// Is the region attribute restricting this user?
export function regionScope(scopes: Scopes): string[] {
  return scopes.region ?? [];
}

// Document filter: unclassified docs (no regions) are visible to everyone; a
// scoped user additionally sees docs whose regions overlap their scope.
export function documentScopeWhere(scopes: Scopes): Prisma.DocumentWhereInput | undefined {
  const regions = regionScope(scopes);
  if (regions.length === 0) return undefined;
  return { OR: [{ regions: { isEmpty: true } }, { regions: { hasSome: regions } }] };
}

// Download-request filter: scope by the requested document's regions.
export function requestScopeWhere(scopes: Scopes): Prisma.DownloadRequestWhereInput | undefined {
  const regions = regionScope(scopes);
  if (regions.length === 0) return undefined;
  return { document: { is: { OR: [{ regions: { isEmpty: true } }, { regions: { hasSome: regions } }] } } };
}

// Write guard: may this user act on a document with these regions?
export function canActOnDocumentRegions(docRegions: string[], scopes: Scopes): boolean {
  const regions = regionScope(scopes);
  if (regions.length === 0) return true; // unrestricted
  if (docRegions.length === 0) return true; // unclassified
  return docRegions.some((r) => regions.includes(r));
}
