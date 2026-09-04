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
