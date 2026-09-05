// Seed a few default saved charts for the Metrics query builder, so the
// "Custom charts" section ships populated. Idempotent: only when empty.
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
  const count = await prisma.savedChart.count();
  if (count > 0) {
    console.log(`[seed-charts] ${count} charts already present — skipping.`);
    return;
  }
  for (const d of defaults) {
    await prisma.savedChart.create({ data: { ...d, filters: { from: null, to: null } } });
  }
  console.log(`[seed-charts] created ${defaults.length} default charts.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
