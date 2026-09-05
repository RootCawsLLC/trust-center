// Seed the Attribute Manager (TaxonomyOption) from the registry defaults PLUS
// any values already present in the data, so converting a free-text field to a
// dropdown never drops a value that's currently in use. Idempotent: existing
// options keep their order; only missing values are appended.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Mirrors src/lib/taxonomy.ts / constants.ts (kept inline: this is a .mjs script
// and cannot import the TS modules directly).
const FRAMEWORKS = ["SOC 2", "ISO 27001", "ISO 27701", "HIPAA", "HITRUST", "PCI DSS", "GDPR", "CCPA", "NIST CSF", "FedRAMP", "EU AI Act"];
const INDUSTRIES = ["Healthcare", "Financial Services", "Public Sector", "Technology", "Retail & E-commerce", "Education", "Manufacturing", "Energy & Utilities"];
const REGIONS = ["North America", "European Union", "United Kingdom", "APAC", "LATAM", "Middle East & Africa", "Global"];
const KB_CATEGORIES = ["General", "Security", "Privacy", "Compliance", "Infrastructure", "Data handling", "Product", "Legal"];

const DEFAULTS = {
  "document.framework": FRAMEWORKS,
  "document.industry": INDUSTRIES,
  "document.region": REGIONS,
  "risk.category": ["Resilience", "Data protection", "Access control", "Infrastructure", "Governance", "Reputation"],
  "raci.area": ["Physical & infrastructure security", "Data encryption", "Identity & access management", "Application security", "Configuration & patching", "Incident response", "Business continuity"],
  "compliance.framework": FRAMEWORKS,
  "compliance.product": ["Platform", "GovCloud", "EU Region", "Mobile"],
  "certification.framework": FRAMEWORKS,
  "knowledge.category": KB_CATEGORIES,
};

function uniq(arr) {
  return [...new Set(arr.filter((v) => v != null && String(v).trim() !== ""))];
}

async function harvest() {
  const [docs, risk, raci, events, certs] = await Promise.all([
    prisma.document.findMany({ select: { frameworks: true, industries: true, regions: true } }),
    prisma.riskProfileItem.findMany({ select: { category: true } }),
    prisma.raciItem.findMany({ select: { area: true } }),
    prisma.complianceEvent.findMany({ select: { framework: true, product: true } }),
    prisma.certification.findMany({ select: { framework: true } }),
  ]);
  return {
    "document.framework": docs.flatMap((d) => d.frameworks),
    "document.industry": docs.flatMap((d) => d.industries),
    "document.region": docs.flatMap((d) => d.regions),
    "risk.category": risk.map((r) => r.category),
    "raci.area": raci.map((r) => r.area),
    "compliance.framework": events.map((e) => e.framework),
    "compliance.product": events.map((e) => e.product),
    "certification.framework": certs.map((c) => c.framework),
    "knowledge.category": [],
  };
}

async function main() {
  const harvested = await harvest();
  let added = 0;
  for (const [taxonomy, defaults] of Object.entries(DEFAULTS)) {
    const values = uniq([...defaults, ...(harvested[taxonomy] ?? [])]);
    const existing = await prisma.taxonomyOption.findMany({ where: { taxonomy }, select: { value: true, sortOrder: true } });
    const have = new Set(existing.map((e) => e.value));
    let next = existing.reduce((m, e) => Math.max(m, e.sortOrder), 0);
    for (const value of values) {
      if (have.has(value)) continue;
      next += 1;
      await prisma.taxonomyOption.create({ data: { taxonomy, value, sortOrder: next, isActive: true } });
      added += 1;
    }
  }
  console.log(`[seed-attributes] taxonomies: ${Object.keys(DEFAULTS).length}, options added: ${added}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
