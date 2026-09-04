// Seed data for local/UAT review: admin + RBAC users, a default NDA template,
// a mock Salesforce customer directory, and sample documents (real generated
// PDFs written to local storage). Idempotent-ish: clears mutable content tables
// and re-seeds. The immutable ledger is never touched here.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { promises as fs } from "node:fs";
import path from "node:path";

try {
  process.loadEnvFile(".env");
} catch {
  /* env may already be set */
}

const prisma = new PrismaClient();
const STORAGE_DIR = path.resolve(process.env.LOCAL_STORAGE_DIR ?? "./storage");

// --- Minimal valid single-page PDF generator (Helvetica text). ---
function esc(s) {
  return String(s).replace(/([\\()])/g, "\\$1");
}
function makePdf(title, lines = []) {
  const stream =
    `BT /F1 20 Tf 72 720 Td (${esc(title)}) Tj\n` +
    `/F1 11 Tf\n` +
    lines.map((l) => `0 -20 Td (${esc(l)}) Tj`).join("\n") +
    `\nET`;
  let pdf = "%PDF-1.4\n";
  const off = {};
  const addObj = (n, body) => {
    off[n] = Buffer.byteLength(pdf, "latin1");
    pdf += `${n} 0 obj\n${body}\nendobj\n`;
  };
  addObj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  addObj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  addObj(
    3,
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
  );
  addObj(
    4,
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
  );
  addObj(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const xrefPos = Buffer.byteLength(pdf, "latin1");
  let xref = "xref\n0 6\n0000000000 65535 f \n";
  for (let i = 1; i <= 5; i++) {
    xref += String(off[i]).padStart(10, "0") + " 00000 n \n";
  }
  pdf += xref + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

// Storage-aware blob write: mirrors src/lib/storage.ts so seeding works in any
// environment (local disk in dev, S3 in a deployed/UAT environment).
async function storeBlob(key, buf, contentType) {
  if ((process.env.STORAGE_DRIVER ?? "local") === "s3") {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const s3 = new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: buf,
        ContentType: contentType,
        ServerSideEncryption: "AES256",
      }),
    );
    return;
  }
  const p = path.join(STORAGE_DIR, key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, buf);
  await fs.writeFile(`${p}.type`, contentType, "utf8");
}

async function main() {
  // --- Users (credentials-based for pre-SSO review) ---
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@trustcenter.local").toLowerCase();
  const adminPass = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!Admin123";
  const adminName = process.env.SEED_ADMIN_NAME ?? "Trust Center Admin";

  const owner = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "OWNER", isActive: true, passwordHash: await bcrypt.hash(adminPass, 12), name: adminName },
    create: {
      email: adminEmail,
      name: adminName,
      role: "OWNER",
      passwordHash: await bcrypt.hash(adminPass, 12),
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: "viewer@trustcenter.local" },
    update: {},
    create: {
      email: "viewer@trustcenter.local",
      name: "Read-Only Analyst",
      role: "VIEWER",
      passwordHash: await bcrypt.hash("ChangeMe!Viewer123", 12),
      isActive: true,
    },
  });

  // --- Default NDA template ---
  const ndaBody = `MUTUAL NON-DISCLOSURE AGREEMENT (CLICK-THROUGH)

By accepting below, you ("Recipient") agree that any confidential materials made
available through this Trust Center — including security policies, audit reports,
penetration test summaries, and related documentation — are provided in
confidence.

1. Confidentiality. Recipient will not disclose the confidential materials to any
   third party and will use them solely to evaluate the Company's security posture.
2. No License. No intellectual property rights are granted except the limited right
   to review.
3. Term. Confidentiality obligations survive for three (3) years from the date of
   acceptance.
4. Record. Recipient acknowledges that acceptance is recorded with name, email,
   organization, timestamp, and IP address.

This is a demonstration NDA template. Replace with your organization's approved
language in the admin console before UAT.`;

  // Idempotent: upsert content so re-seeding is safe even after requests exist
  // (deleting documents referenced by the immutable ledger would violate FKs).
  const ndaName = "Standard Mutual NDA (Template)";
  let nda = await prisma.ndaTemplate.findFirst({ where: { name: ndaName } });
  if (nda) {
    nda = await prisma.ndaTemplate.update({
      where: { id: nda.id },
      data: { bodyMarkdown: ndaBody, isActive: true, isDefault: true },
    });
  } else {
    nda = await prisma.ndaTemplate.create({
      data: { name: ndaName, bodyMarkdown: ndaBody, isActive: true, isDefault: true },
    });
  }

  // --- Mock Salesforce customer directory ---
  const customers = [
    { accountName: "Northwind Traders", primaryDomain: "northwind.com", additionalDomains: ["northwind.co.uk"], tier: "Enterprise", region: "AMER", accountOwner: "Dana Price" },
    { accountName: "Contoso Ltd", primaryDomain: "contoso.com", additionalDomains: [], tier: "Enterprise", region: "EMEA", accountOwner: "Sam Ruiz" },
    { accountName: "Fabrikam Inc", primaryDomain: "fabrikam.com", additionalDomains: ["fabrikam.io"], tier: "Mid-Market", region: "AMER", accountOwner: "Dana Price" },
    { accountName: "Tailspin Toys", primaryDomain: "tailspintoys.com", additionalDomains: [], tier: "SMB", region: "APAC", accountOwner: "Lee Warren" },
    { accountName: "Adventure Works", primaryDomain: "adventure-works.com", additionalDomains: [], tier: "Mid-Market", region: "AMER", accountOwner: "Sam Ruiz" },
    { accountName: "Wingtip Toys", primaryDomain: "wingtiptoys.com", additionalDomains: [], tier: "SMB", region: "EMEA", accountOwner: "Lee Warren" },
  ];
  for (const c of customers) {
    await prisma.mockSalesforceCustomer.upsert({
      where: { primaryDomain: c.primaryDomain },
      update: c,
      create: c,
    });
  }

  // --- Documents (mix of public/private, categories, and taxonomy tags) ---
  const docs = [
    { title: "ISO 27001 Certificate", category: "CERTIFICATION", visibility: "PUBLIC", desc: "Our current ISO/IEC 27001 certificate of registration.", frameworks: ["ISO 27001"], regions: ["Global"], industries: [], lines: ["Certificate number: ISO-EX-27001-001.", "Valid three years, surveillance audits annual."] },
    { title: "ISO 27701 Privacy Certificate", category: "CERTIFICATION", visibility: "PUBLIC", desc: "ISO/IEC 27701 privacy information management certification.", frameworks: ["ISO 27701", "GDPR"], regions: ["Global", "European Union"], industries: [], lines: ["Extends our ISMS to privacy.", "Covers PII controllers and processors."] },
    { title: "HITRUST CSF Certification", category: "CERTIFICATION", visibility: "PUBLIC", desc: "HITRUST CSF certification for healthcare data handling.", frameworks: ["HITRUST", "HIPAA"], regions: ["North America"], industries: ["Healthcare"], lines: ["r2 validated assessment.", "Covers the full HITRUST control set."] },
    { title: "PCI DSS Attestation of Compliance", category: "CERTIFICATION", visibility: "PRIVATE", desc: "PCI DSS v4.0 Attestation of Compliance (AoC).", frameworks: ["PCI DSS"], regions: ["Global"], industries: ["Financial Services", "Retail & E-commerce"], lines: ["Service Provider Level 1.", "Full AoC available under NDA."] },
    { title: "FedRAMP Authorization Letter", category: "CERTIFICATION", visibility: "PRIVATE", desc: "FedRAMP Moderate authorization letter for our government offering.", frameworks: ["FedRAMP", "NIST CSF"], regions: ["North America"], industries: ["Public Sector"], lines: ["Agency ATO on file.", "Package available to agencies under NDA."] },
    { title: "SOC 2 Type II Report", category: "AUDIT", visibility: "PRIVATE", desc: "Independent SOC 2 Type II examination covering Security and Availability.", frameworks: ["SOC 2"], regions: ["North America"], industries: [], lines: ["Auditor: Example Assurance LLP.", "Period: 12 months.", "Detailed control test results."] },
    { title: "SOC 3 Report", category: "AUDIT", visibility: "PUBLIC", desc: "Public SOC 3 general-use report.", frameworks: ["SOC 2"], regions: ["North America"], industries: [], lines: ["General-use summary of our SOC 2.", "Freely shareable."] },
    { title: "Penetration Test Summary", category: "REPORT", visibility: "PRIVATE", desc: "Executive summary of our latest third-party penetration test.", frameworks: [], regions: ["Global"], industries: [], lines: ["Tester: Example Offensive Security.", "No critical findings outstanding.", "Full report under NDA."] },
    { title: "Information Security Policy", category: "POLICY", visibility: "PUBLIC", desc: "Our overarching information security policy and governance model.", frameworks: ["ISO 27001", "SOC 2"], regions: ["Global"], industries: [], lines: ["Scope, roles, and responsibilities.", "Acceptable use and data classification."] },
    { title: "Data Retention & Deletion Policy", category: "POLICY", visibility: "PUBLIC", desc: "How long we keep data and how we delete it on request.", frameworks: ["GDPR", "CCPA"], regions: ["European Union", "North America"], industries: [], lines: ["Retention schedule by data type.", "Right-to-erasure workflow."] },
    { title: "Business Continuity Plan", category: "PROCEDURE", visibility: "PRIVATE", desc: "How we maintain and recover critical services during disruption.", frameworks: ["ISO 27001"], regions: ["Global"], industries: [], lines: ["RTO/RPO targets by service tier.", "Annual tabletop results."] },
    { title: "Incident Response Plan", category: "PROCEDURE", visibility: "PRIVATE", desc: "Roles, runbooks, and communications for security incidents.", frameworks: ["SOC 2", "NIST CSF"], regions: ["Global"], industries: [], lines: ["Severity definitions.", "Breach notification timelines."] },
    { title: "Vulnerability Management Procedure", category: "PROCEDURE", visibility: "PUBLIC", desc: "Our process for identifying, triaging, and remediating vulnerabilities.", frameworks: ["ISO 27001"], regions: ["Global"], industries: [], lines: ["Remediation SLA by severity.", "Scanning cadence and tooling."] },
    { title: "HIPAA Compliance Overview", category: "WHITEPAPER", visibility: "PUBLIC", desc: "How we support HIPAA-covered entities and business associates.", frameworks: ["HIPAA", "HITRUST"], regions: ["North America"], industries: ["Healthcare"], lines: ["BAA available on request.", "Safeguards mapped to the Security Rule."] },
    { title: "Data Processing Whitepaper", category: "WHITEPAPER", visibility: "PUBLIC", desc: "How customer data is processed, stored, and protected.", frameworks: ["GDPR"], regions: ["European Union", "Global"], industries: [], lines: ["Sub-processor list and locations.", "Encryption in transit and at rest.", "Data residency options."] },
    { title: "GDPR Data Processing Addendum (DPA)", category: "LEGAL", visibility: "PRIVATE", desc: "Our standard GDPR-compliant Data Processing Addendum.", frameworks: ["GDPR"], regions: ["European Union", "United Kingdom"], industries: [], lines: ["Standard Contractual Clauses included.", "Countersigned copy under NDA."] },
    { title: "EU AI Act Addendum", category: "LEGAL", visibility: "PRIVATE", desc: "Contractual addendum addressing EU AI Act obligations.", frameworks: ["EU AI Act"], regions: ["European Union"], industries: ["Technology"], lines: ["Risk classification of AI features.", "Transparency and human-oversight commitments."] },
  ];

  let created = 0;
  let updated = 0;
  for (const d of docs) {
    const common = {
      description: d.desc,
      category: d.category,
      visibility: d.visibility,
      isPublished: true,
      industries: d.industries ?? [],
      regions: d.regions ?? [],
      frameworks: d.frameworks ?? [],
      ndaTemplateId: d.visibility === "PRIVATE" ? nda.id : null,
    };
    const existing = await prisma.document.findFirst({ where: { title: d.title } });
    if (existing) {
      await prisma.document.update({ where: { id: existing.id }, data: common });
      updated++;
      continue;
    }
    const doc = await prisma.document.create({
      data: {
        title: d.title,
        ...common,
        storageKey: "pending",
        fileName: `${d.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: 0,
        version: "1.0",
        createdById: owner.id,
      },
    });
    const pdf = makePdf(d.title, [d.desc, "", ...d.lines]);
    const key = `documents/${doc.id}.pdf`;
    await storeBlob(key, pdf, "application/pdf");
    await prisma.document.update({
      where: { id: doc.id },
      data: { storageKey: key, sizeBytes: pdf.length },
    });
    created++;
  }

  // --- Subprocessors / Knowledge base / Updates (only if empty) ---
  if ((await prisma.subprocessor.count()) === 0) {
    await prisma.subprocessor.createMany({
      data: [
        { name: "Amazon Web Services", purpose: "Cloud infrastructure & hosting", location: "United States (us-east-1)", website: "https://aws.amazon.com", sortOrder: 1 },
        { name: "Cloudflare", purpose: "CDN & DDoS protection", location: "Global", website: "https://cloudflare.com", sortOrder: 2 },
        { name: "Datadog", purpose: "Application & infrastructure monitoring", location: "United States", website: "https://datadoghq.com", sortOrder: 3 },
        { name: "Stripe", purpose: "Payment processing", location: "United States", website: "https://stripe.com", sortOrder: 4 },
        { name: "Twilio SendGrid", purpose: "Transactional email", location: "United States", website: "https://sendgrid.com", sortOrder: 5 },
        { name: "Snowflake", purpose: "Data warehousing & analytics", location: "European Union (eu-central-1)", website: "https://snowflake.com", sortOrder: 6 },
      ],
    });
  }
  if ((await prisma.knowledgeArticle.count()) === 0) {
    await prisma.knowledgeArticle.createMany({
      data: [
        { title: "How do I request access to confidential documents?", category: "Getting started", sortOrder: 1, bodyMarkdown: "Open any document marked \"NDA required,\" fill in your details, then read and accept the click-through NDA. Access is granted immediately after acceptance." },
        { title: "Where is customer data stored?", category: "Security", sortOrder: 2, bodyMarkdown: "Production data is hosted on AWS in the United States, with an EU data-residency option available on request. All data is encrypted in transit (TLS 1.2+) and at rest (AES-256)." },
        { title: "What is your data retention & deletion policy?", category: "Privacy", sortOrder: 3, bodyMarkdown: "We retain customer data for the life of the contract plus 30 days, after which it is deleted. See the Data Retention & Deletion Policy in the document center for specifics, and submit deletion requests to privacy@example.com." },
        { title: "How do I report a security vulnerability?", category: "Security", sortOrder: 4, bodyMarkdown: "Email security@example.com with details and reproduction steps. We acknowledge reports within one business day and do not pursue good-faith researchers." },
      ],
    });
  }
  if ((await prisma.trustUpdate.count()) === 0) {
    await prisma.trustUpdate.createMany({
      data: [
        { title: "SOC 2 Type II report for 2026 now available", type: "compliance", bodyMarkdown: "Our latest SOC 2 Type II report, covering a 12-month period, is available under NDA in the document center.", publishedAt: new Date("2026-08-15") },
        { title: "Added EU AI Act contractual addendum", type: "new", bodyMarkdown: "A new contractual addendum addressing EU AI Act obligations is available for customers deploying our AI features in the EU.", publishedAt: new Date("2026-07-02") },
        { title: "Enforced TLS 1.3 and rotated certificates", type: "security", bodyMarkdown: "We now require TLS 1.3 for all customer-facing endpoints and completed our scheduled certificate rotation.", publishedAt: new Date("2026-06-10") },
        { title: "Trust Center launched", type: "update", bodyMarkdown: "Welcome to our Trust Center — a single place to review our security posture, certifications, and legal documents.", publishedAt: new Date("2026-05-01") },
      ],
    });
  }

  console.log(
    `[seed] users, NDA template, ${customers.length} SF customers, documents: ${created} created / ${updated} updated. Admin: ${adminEmail}`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
