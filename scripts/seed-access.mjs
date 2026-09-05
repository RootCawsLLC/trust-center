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
  { key: "freshdesk", name: "Freshworks (Freshdesk)", category: "Ticketing", note: "Forward trust-center tickets to Freshdesk. Native ticketing stays the default." },
  { key: "zendesk", name: "Zendesk", category: "Ticketing", note: "Sync trust-center tickets to Zendesk." },
  { key: "jira-sm", name: "Jira Service Management", category: "Ticketing", note: "Raise Jira Service Management issues from tickets." },
];

for (const g of groups) {
  await p.group.upsert({ where: { name: g.name }, update: g, create: g });
}

// Demo ABAC scope: an "EU InfoSec" group scoped to the European Union region,
// so the Groups UI shows an attribute scope in action.
await p.group.upsert({
  where: { name: "EU InfoSec" },
  update: { attributeScopes: { region: ["European Union"], business_unit: ["EMEA"] } },
  create: { name: "EU InfoSec", description: "InfoSec team scoped to EU content", defaultRole: "ADMIN", attributeScopes: { region: ["European Union"], business_unit: ["EMEA"] } },
});
for (const i of integrations) {
  await p.integration.upsert({ where: { key: i.key }, update: { name: i.name, category: i.category, note: i.note }, create: i });
}

// Access-approval demo: auto-approval rules + a couple of approvals attached to
// existing private-document requests so the Access requests tab is populated.
if ((await p.accessRule.count()) === 0) {
  await p.accessRule.createMany({
    data: [
      { domain: "northwind.com", decision: "approve", note: "Existing customer" },
      { domain: "globex.com", decision: "approve", note: "Existing customer" },
      { domain: "spammer.example", decision: "deny", note: "Blocklisted" },
    ],
  });
}
if ((await p.accessApproval.count()) === 0) {
  const reqs = await p.downloadRequest.findMany({ where: { documentVisibility: "PRIVATE" }, take: 2, orderBy: { createdAt: "desc" } });
  if (reqs[0]) await p.accessApproval.create({ data: { downloadRequestId: reqs[0].id, status: "pending" } });
  if (reqs[1]) await p.accessApproval.create({ data: { downloadRequestId: reqs[1].id, status: "approved", decidedByEmail: "admin@trustcenter.local", decidedAt: new Date(), reason: "Verified customer" } });
}

console.log("seeded", groups.length, "groups,", integrations.length, "integrations, access rules + demo approvals");
await p.$disconnect();
