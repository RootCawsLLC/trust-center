import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const risk = [
  { category: "Resilience", label: "Recovery Time Objective (RTO)", value: "4 hours", sortOrder: 1 },
  { category: "Resilience", label: "Recovery Point Objective (RPO)", value: "15 minutes", sortOrder: 2 },
  { category: "Resilience", label: "Uptime SLA", value: "99.9%", sortOrder: 3 },
  { category: "Data", label: "Encryption at rest", value: "AES-256", sortOrder: 4 },
  { category: "Data", label: "Encryption in transit", value: "TLS 1.2+", sortOrder: 5 },
  { category: "Data", label: "Data residency options", value: "US / EU", sortOrder: 6 },
  { category: "Access", label: "MFA enforced", value: "Yes (all staff)", sortOrder: 7 },
  { category: "Assurance", label: "Penetration testing", value: "Annual, third-party", sortOrder: 8 },
];

const raci = [
  { area: "Physical & infrastructure security", corporate: "A", product: "R", customer: "I", sortOrder: 1 },
  { area: "Data encryption (at rest & in transit)", corporate: "A", product: "R", customer: "I", sortOrder: 2 },
  { area: "Identity & access management (your users)", corporate: "C", product: "C", customer: "R", sortOrder: 3, note: "You manage your users, roles, and SSO." },
  { area: "Application & platform security", corporate: "A", product: "R", customer: "I", sortOrder: 4 },
  { area: "Incident response", corporate: "R", product: "C", customer: "I", sortOrder: 5 },
  { area: "Data classification & acceptable use", corporate: "C", product: "I", customer: "R", sortOrder: 6, note: "You decide what data you put into the product." },
];

const events = [
  { title: "SOC 2 Type II report", detail: "Next examination window", framework: "SOC 2", window: "Expected Q1 2027", status: "planned", sortOrder: 1 },
  { title: "ISO/IEC 27001 surveillance audit", detail: "Annual audit cycle", framework: "ISO 27001", window: "March – October (annual)", status: "in-progress", sortOrder: 2 },
  { title: "FedRAMP Moderate authorization", detail: "GovCloud offering", framework: "FedRAMP", product: "GovCloud", window: "In progress — 2026", status: "in-progress", sortOrder: 3 },
  { title: "Third-party penetration test", detail: "Annual", window: "Q3 2026", status: "planned", sortOrder: 4 },
];

for (const r of risk) await p.riskProfileItem.upsert({ where: { id: "seed-risk-" + r.sortOrder }, update: r, create: { id: "seed-risk-" + r.sortOrder, ...r } });
for (const r of raci) await p.raciItem.upsert({ where: { id: "seed-raci-" + r.sortOrder }, update: r, create: { id: "seed-raci-" + r.sortOrder, ...r } });
for (const e of events) await p.complianceEvent.upsert({ where: { id: "seed-event-" + e.sortOrder }, update: e, create: { id: "seed-event-" + e.sortOrder, ...e } });

console.log("seeded", risk.length, "risk,", raci.length, "raci,", events.length, "events");
await p.$disconnect();
