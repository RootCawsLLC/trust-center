import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const certs = [
  {
    framework: "SOC 2",
    slug: "soc-2",
    displayName: "SOC 2 Type II",
    status: "Certified",
    summaryHtml:
      "<p>We maintain a <strong>SOC 2 Type II</strong> report covering the Security and Availability Trust Services Criteria, examined annually by an independent CPA firm. The report covers a 12-month observation window and is available under NDA.</p><ul><li>Independent annual examination</li><li>Continuous control monitoring</li><li>Available under NDA below</li></ul>",
    productsInScope: ["Platform", "API"],
    sortOrder: 1,
  },
  {
    framework: "FedRAMP",
    slug: "fedramp",
    displayName: "FedRAMP Moderate",
    status: "In progress",
    summaryHtml:
      "<p>Our <strong>GovCloud</strong> offering is pursuing <strong>FedRAMP Moderate</strong> authorization. The authorization boundary is limited to the GovCloud deployment; the commercial platform is out of scope.</p>",
    productsInScope: ["GovCloud"],
    sortOrder: 2,
  },
  {
    framework: "GDPR",
    slug: "gdpr",
    displayName: "GDPR",
    status: "Certified",
    summaryHtml:
      "<p>We process personal data in accordance with the <strong>EU GDPR</strong>. A Data Processing Addendum (DPA) is available, and EU data-residency options are supported for the Platform and API.</p>",
    productsInScope: ["Platform", "API", "Mobile"],
    sortOrder: 3,
  },
];

for (const c of certs) {
  await p.certification.upsert({ where: { framework: c.framework }, update: c, create: c });
}
console.log("seeded", certs.length, "certifications");
await p.$disconnect();
