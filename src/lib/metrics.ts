import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type ChartRow = { label: string; n: number };
export type ChartFilters = { from?: string; to?: string };

// Datasets and the dimensions you can group each by. This drives the Metrics
// query builder and validates saved-chart definitions.
export const DATASETS = [
  {
    key: "requests",
    label: "Document requests",
    dimensions: [
      { key: "month", label: "Over time (month)" },
      { key: "classification", label: "Customer vs. lead" },
      { key: "documentTitle", label: "Document" },
      { key: "documentCategory", label: "Category" },
      { key: "visibility", label: "Public vs. private" },
      { key: "country", label: "Country" },
      { key: "emailDomain", label: "Requesting domain" },
      { key: "framework", label: "Framework" },
      { key: "industry", label: "Industry" },
    ],
  },
  {
    key: "tickets",
    label: "Tickets",
    dimensions: [
      { key: "status", label: "Status" },
      { key: "priority", label: "Priority" },
      { key: "source", label: "Source" },
      { key: "matchedCustomerName", label: "Customer" },
    ],
  },
] as const;

export const CHART_TYPES = [
  { key: "bar", label: "Bar" },
  { key: "pie", label: "Donut" },
  { key: "table", label: "Table" },
] as const;

export function datasetDef(key: string) {
  return DATASETS.find((d) => d.key === key);
}
export function isValidDimension(dataset: string, dimension: string): boolean {
  return !!datasetDef(dataset)?.dimensions.some((d) => d.key === dimension);
}

function tally(pairs: string[], limit = 12): ChartRow[] {
  const m = new Map<string, number>();
  for (const p of pairs) {
    const key = p == null || p === "" ? "—" : p;
    m.set(key, (m.get(key) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([label, n]) => ({ label, n }))
    .sort((a, b) => b.n - a.n)
    .slice(0, limit);
}

function dateRange(from?: string, to?: string): { gte?: Date; lte?: Date } | undefined {
  const r: { gte?: Date; lte?: Date } = {};
  if (from) r.gte = new Date(from);
  if (to) {
    const d = new Date(to);
    d.setHours(23, 59, 59, 999);
    r.lte = d;
  }
  return r.gte || r.lte ? r : undefined;
}

/**
 * Compute a chart's rows live from the current data. Group-by is done in memory
 * (populations here are small and the request dataset needs a document join for
 * framework/industry), matching the existing Metrics panels.
 */
export async function runChart(dataset: string, dimension: string, filters: ChartFilters = {}): Promise<ChartRow[]> {
  const created = dateRange(filters.from, filters.to);

  if (dataset === "tickets") {
    const where: Prisma.TicketWhereInput = created ? { createdAt: created } : {};
    const tickets = await prisma.ticket.findMany({ where, select: { status: true, priority: true, source: true, matchedCustomerName: true } });
    switch (dimension) {
      case "status": return tally(tickets.map((t) => t.status));
      case "priority": return tally(tickets.map((t) => t.priority));
      case "source": return tally(tickets.map((t) => t.source));
      case "matchedCustomerName": return tally(tickets.map((t) => t.matchedCustomerName ?? "Unmatched"));
      default: return [];
    }
  }

  // requests
  const where: Prisma.DownloadRequestWhereInput = created ? { createdAt: created } : {};
  const requests = await prisma.downloadRequest.findMany({
    where,
    select: { documentId: true, documentTitle: true, documentCategory: true, documentVisibility: true, classification: true, country: true, emailDomain: true, createdAt: true },
  });

  switch (dimension) {
    case "month": {
      const rows = tally(requests.map((r) => r.createdAt.toLocaleString("en-US", { month: "short", year: "numeric" })), 24);
      // chronological for a time series
      return rows.sort((a, b) => new Date("1 " + a.label).getTime() - new Date("1 " + b.label).getTime());
    }
    case "classification": return tally(requests.map((r) => (r.classification === "CUSTOMER" ? "Customer" : "Lead")));
    case "documentTitle": return tally(requests.map((r) => r.documentTitle));
    case "documentCategory": return tally(requests.map((r) => r.documentCategory));
    case "visibility": return tally(requests.map((r) => (r.documentVisibility === "PUBLIC" ? "Public" : "Private")));
    case "country": return tally(requests.map((r) => r.country));
    case "emailDomain": return tally(requests.map((r) => r.emailDomain));
    case "framework":
    case "industry": {
      const docIds = [...new Set(requests.map((r) => r.documentId))];
      const docs = await prisma.document.findMany({ where: { id: { in: docIds } }, select: { id: true, frameworks: true, industries: true } });
      const map = new Map(docs.map((d) => [d.id, d]));
      const field = dimension === "framework" ? "frameworks" : "industries";
      return tally(requests.flatMap((r) => map.get(r.documentId)?.[field] ?? []));
    }
    default:
      return [];
  }
}
