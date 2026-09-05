import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const groups = [
  // InfoSec: full admin, no custom matrix (inherits ADMIN edit everywhere).
  { name: "InfoSec", description: "Security & compliance team", defaultRole: "ADMIN", permissions: {} },
  // Legal: edits the legal/document surface, read-only elsewhere.
  {
    name: "Legal",
    description: "Legal & privacy",
    defaultRole: "ADMIN",
    permissions: {
      documents: "edit", certifications: "edit", nda: "edit", "shared-responsibility": "edit",
      "risk-profile": "view", tickets: "view", metrics: "view", requests: "view",
      subprocessors: "view", knowledge: "view", updates: "view",
      settings: "none", audit: "none", attributes: "none", integrations: "none", leads: "none",
    },
  },
  // Sales: works tickets & leads, can view the public content, nothing sensitive.
  {
    name: "Sales",
    description: "Sales & customer-facing",
    defaultRole: "VIEWER",
    permissions: {
      tickets: "edit", leads: "view", requests: "view", documents: "view",
      certifications: "view", knowledge: "view", metrics: "view",
      settings: "none", audit: "none", attributes: "none", nda: "none", integrations: "none",
    },
  },
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
