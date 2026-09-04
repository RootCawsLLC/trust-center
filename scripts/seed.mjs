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

  // Reset mutable content (never the ledger).
  await prisma.document.deleteMany({});
  await prisma.ndaTemplate.deleteMany({});
  await prisma.mockSalesforceCustomer.deleteMany({});
  await prisma.salesLead.deleteMany({});

  const nda = await prisma.ndaTemplate.create({
    data: {
      name: "Standard Mutual NDA (Template)",
      bodyMarkdown: ndaBody,
      isActive: true,
      isDefault: true,
    },
  });

  // --- Mock Salesforce customer directory ---
  const customers = [
    { accountName: "Northwind Traders", primaryDomain: "northwind.com", additionalDomains: ["northwind.co.uk"], tier: "Enterprise", region: "AMER", accountOwner: "Dana Price" },
    { accountName: "Contoso Ltd", primaryDomain: "contoso.com", additionalDomains: [], tier: "Enterprise", region: "EMEA", accountOwner: "Sam Ruiz" },
    { accountName: "Fabrikam Inc", primaryDomain: "fabrikam.com", additionalDomains: ["fabrikam.io"], tier: "Mid-Market", region: "AMER", accountOwner: "Dana Price" },
    { accountName: "Tailspin Toys", primaryDomain: "tailspintoys.com", additionalDomains: [], tier: "SMB", region: "APAC", accountOwner: "Lee Warren" },
    { accountName: "Adventure Works", primaryDomain: "adventure-works.com", additionalDomains: [], tier: "Mid-Market", region: "AMER", accountOwner: "Sam Ruiz" },
    { accountName: "Wingtip Toys", primaryDomain: "wingtiptoys.com", additionalDomains: [], tier: "SMB", region: "EMEA", accountOwner: "Lee Warren" },
  ];
  await prisma.mockSalesforceCustomer.createMany({ data: customers });

  // --- Documents (mix of public/private across categories) ---
  const docs = [
    { title: "Information Security Policy", category: "POLICY", visibility: "PUBLIC", desc: "Our overarching information security policy and governance model.", lines: ["Scope, roles, and responsibilities.", "Acceptable use and data classification.", "Reviewed annually by the security team."] },
    { title: "SOC 2 Type II Report", category: "AUDIT", visibility: "PRIVATE", desc: "Independent SOC 2 Type II examination covering Security and Availability.", lines: ["Auditor: Example Assurance LLP.", "Period: 12 months.", "Contains detailed control test results."] },
    { title: "Penetration Test Summary", category: "REPORT", visibility: "PRIVATE", desc: "Executive summary of our latest third-party penetration test.", lines: ["Tester: Example Offensive Security.", "No critical findings outstanding.", "Full report available under NDA."] },
    { title: "ISO 27001 Certificate", category: "CERTIFICATION", visibility: "PUBLIC", desc: "Our current ISO/IEC 27001 certificate of registration.", lines: ["Certificate number: ISO-EX-27001-001.", "Valid for three years, surveillance audits annual."] },
    { title: "Business Continuity Plan", category: "PROCEDURE", visibility: "PRIVATE", desc: "How we maintain and recover critical services during disruption.", lines: ["RTO/RPO targets by service tier.", "Annual tabletop exercise results."] },
    { title: "Data Processing Whitepaper", category: "WHITEPAPER", visibility: "PUBLIC", desc: "How customer data is processed, stored, and protected.", lines: ["Sub-processor list and locations.", "Encryption in transit and at rest.", "Data residency options."] },
    { title: "Vulnerability Management Procedure", category: "PROCEDURE", visibility: "PUBLIC", desc: "Our process for identifying, triaging, and remediating vulnerabilities.", lines: ["SLA by severity.", "Scanning cadence and tooling."] },
    { title: "Incident Response Plan", category: "PROCEDURE", visibility: "PRIVATE", desc: "Roles, runbooks, and communications for security incidents.", lines: ["Severity definitions.", "Notification timelines.", "Post-incident review process."] },
  ];

  let n = 0;
  for (const d of docs) {
    const created = await prisma.document.create({
      data: {
        title: d.title,
        description: d.desc,
        category: d.category,
        visibility: d.visibility,
        storageKey: "pending",
        fileName: `${d.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: 0,
        version: "1.0",
        isPublished: true,
        ndaTemplateId: d.visibility === "PRIVATE" ? nda.id : null,
        createdById: owner.id,
      },
    });
    const pdf = makePdf(d.title, [d.desc, "", ...d.lines]);
    const key = `documents/${created.id}.pdf`;
    await storeBlob(key, pdf, "application/pdf");
    await prisma.document.update({
      where: { id: created.id },
      data: { storageKey: key, sizeBytes: pdf.length },
    });
    n++;
  }

  console.log(
    `[seed] users(owner+viewer), NDA template, ${customers.length} SF customers, ${n} documents. Admin: ${adminEmail}`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
