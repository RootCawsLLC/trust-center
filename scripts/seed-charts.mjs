// Seed dashboard views + default saved charts for the Metrics query builder.
// Idempotent: creates an "Overview" default view (+ a "Q1 2026" example), seeds
// starter charts into Overview when empty, and adopts any orphaned charts.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const defaults = [
  { name: "Requests by customer vs. lead", dataset: "requests", dimension: "classification", chartType: "pie", sortOrder: 1 },
  { name: "Requests over time", dataset: "requests", dimension: "month", chartType: "bar", sortOrder: 2 },
  { name: "Most requested documents", dataset: "requests", dimension: "documentTitle", chartType: "bar", sortOrder: 3 },
  { name: "Demand by framework", dataset: "requests", dimension: "framework", chartType: "table", sortOrder: 4 },
  { name: "Tickets by status", dataset: "tickets", dimension: "status", chartType: "pie", sortOrder: 5 },
  { name: "Tickets by priority", dataset: "tickets", dimension: "priority", chartType: "bar", sortOrder: 6 },
];

async function main() {
  // Ensure a default "Overview" dashboard.
  let overview = await prisma.dashboard.findFirst({ where: { name: "Overview" } });
  if (!overview) {
    overview = await prisma.dashboard.create({ data: { name: "Overview", sortOrder: 1, isDefault: true } });
  }
  // A second example view so the tabs are obviously multi-view.
  const q1 = await prisma.dashboard.findFirst({ where: { name: "Q1 2026" } });
  if (!q1) {
    await prisma.dashboard.create({ data: { name: "Q1 2026", sortOrder: 2 } });
  }

  // Adopt any charts that predate dashboards.
  await prisma.savedChart.updateMany({ where: { dashboardId: null }, data: { dashboardId: overview.id } });

  // Seed starter charts into Overview when it's empty.
  const count = await prisma.savedChart.count({ where: { dashboardId: overview.id } });
  if (count === 0) {
    for (const d of defaults) {
      await prisma.savedChart.create({ data: { ...d, filters: { from: null, to: null }, dashboardId: overview.id } });
    }
    console.log(`[seed-charts] created ${defaults.length} charts in Overview.`);
  } else {
    console.log(`[seed-charts] Overview already has ${count} charts — skipped starters.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
