import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const groups = [
  { name: "InfoSec", description: "Security & compliance team", defaultRole: "ADMIN" },
  { name: "Legal", description: "Legal & privacy", defaultRole: "ADMIN" },
  { name: "Sales", description: "Sales & customer-facing", defaultRole: "VIEWER" },
];

const integrations = [
  { key: "salesforce", name: "Salesforce", category: "CRM", note: "Customer/lead matching. Swap the mock table for a real SOQL query." },
  { key: "google-drive", name: "Google Drive", category: "Storage", note: "Sync documents from a shared drive." },
  { key: "okta", name: "Okta", category: "SSO", note: "OIDC single sign-on for admins." },
  { key: "google-sso", name: "Google Workspace", category: "SSO", note: "Google single sign-on for admins." },
  { key: "ses", name: "Amazon SES", category: "Email", note: "Deliver welcome & notification emails." },
];

for (const g of groups) {
  await p.group.upsert({ where: { name: g.name }, update: g, create: g });
}
for (const i of integrations) {
  await p.integration.upsert({ where: { key: i.key }, update: { name: i.name, category: i.category, note: i.note }, create: i });
}
console.log("seeded", groups.length, "groups,", integrations.length, "integrations");
await p.$disconnect();
