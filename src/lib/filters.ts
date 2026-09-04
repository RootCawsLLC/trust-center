// Helpers for turning URL search params into Prisma filters.

export function dateRangeWhere(from?: string, to?: string) {
  const gte = from ? new Date(`${from}T00:00:00.000Z`) : undefined;
  const lte = to ? new Date(`${to}T23:59:59.999Z`) : undefined;
  if (!gte || isNaN(gte.getTime())) {
    if (!lte || isNaN(lte.getTime())) return undefined;
    return { lte };
  }
  return { gte, ...(lte && !isNaN(lte.getTime()) ? { lte } : {}) };
}

export function firstStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

// Build a Prisma orderBy from ?sort=&dir= params, restricted to an allowlist.
// Returns `any` because the key is dynamic; the allowlist keeps it safe.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function orderByFromParams(
  sort: string | undefined,
  dir: string | undefined,
  allowed: readonly string[],
  fallback: Record<string, "asc" | "desc">,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  const d: "asc" | "desc" = dir === "desc" ? "desc" : "asc";
  if (sort && allowed.includes(sort)) return { [sort]: d };
  return fallback;
}
