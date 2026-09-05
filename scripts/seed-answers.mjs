// Seed a starter answer library covering common security-questionnaire topics,
// so questionnaire drafting works out of the box. Idempotent: only when empty.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const answers = [
  { question: "Do you encrypt data at rest?", answer: "Yes. All customer data is encrypted at rest using AES-256.", category: "Security", tags: ["encryption", "at rest", "aes-256", "data"] },
  { question: "Do you encrypt data in transit?", answer: "Yes. All data in transit is encrypted using TLS 1.2 or higher; we require TLS 1.3 on customer-facing endpoints.", category: "Security", tags: ["encryption", "in transit", "tls"] },
  { question: "What is your Recovery Time Objective (RTO)?", answer: "Our target Recovery Time Objective (RTO) is 4 hours.", category: "Infrastructure", tags: ["rto", "recovery", "resilience", "business continuity"] },
  { question: "What is your Recovery Point Objective (RPO)?", answer: "Our target Recovery Point Objective (RPO) is 15 minutes.", category: "Infrastructure", tags: ["rpo", "recovery", "backups"] },
  { question: "Do you have a SOC 2 Type II report?", answer: "Yes. We maintain a SOC 2 Type II report covering a 12-month period, available under NDA in our Trust Center.", category: "Compliance", tags: ["soc 2", "soc2", "audit", "attestation", "report"] },
  { question: "Do you enforce multi-factor authentication?", answer: "Yes. MFA is enforced for all employees on all systems that access production or customer data.", category: "Security", tags: ["mfa", "multi-factor", "authentication", "access"] },
  { question: "How do you manage access control?", answer: "Access follows least-privilege and role-based access control, is reviewed quarterly, and is revoked promptly on offboarding.", category: "Security", tags: ["access control", "rbac", "least privilege", "identity"] },
  { question: "How often do you back up data?", answer: "Production data is backed up continuously with point-in-time recovery; backups are encrypted and tested regularly.", category: "Infrastructure", tags: ["backups", "backup", "recovery"] },
  { question: "Do you perform penetration testing?", answer: "Yes. We engage an independent third party for annual penetration tests and remediate findings on a risk-prioritized basis.", category: "Security", tags: ["penetration testing", "pentest", "third party", "testing"] },
  { question: "How do you handle security incidents?", answer: "We follow a documented incident response plan with defined severities, on-call rotation, and customer notification within contractual timelines.", category: "Security", tags: ["incident response", "incident", "breach", "notification"] },
  { question: "Where is customer data hosted?", answer: "Production data is hosted on AWS in the United States, with an EU data-residency option available on request.", category: "Infrastructure", tags: ["data residency", "hosting", "aws", "location", "region"] },
  { question: "Do you use subprocessors?", answer: "Yes. Our current subprocessors are listed on our Trust Center, each linking to their own trust/security portal.", category: "Compliance", tags: ["subprocessors", "third party", "vendors", "supply chain"] },
  { question: "Do you conduct security awareness training?", answer: "Yes. All employees complete security and privacy awareness training at onboarding and annually thereafter.", category: "Security", tags: ["training", "awareness", "employees", "security"] },
  { question: "How do you manage vulnerabilities?", answer: "We run continuous vulnerability scanning and dependency monitoring, and patch on a risk-based SLA.", category: "Security", tags: ["vulnerability", "patching", "scanning", "management"] },
  { question: "What is your data retention and deletion policy?", answer: "We retain customer data for the life of the contract plus 30 days, after which it is deleted. Deletion requests are honored per our DPA.", category: "Privacy", tags: ["retention", "deletion", "data", "privacy", "gdpr"] },
  { question: "Are you GDPR compliant?", answer: "Yes. We support GDPR obligations, offer a DPA with standard contractual clauses, and provide EU data residency on request.", category: "Privacy", tags: ["gdpr", "privacy", "dpa", "compliance"] },
];

async function main() {
  const count = await prisma.answerLibraryEntry.count();
  if (count > 0) {
    console.log(`[seed-answers] ${count} entries already present — skipping.`);
    return;
  }
  let i = 0;
  for (const a of answers) {
    i += 1;
    await prisma.answerLibraryEntry.create({
      data: { ...a, confidence: "high", ownerEmail: "security@trustcenter.local", lastReviewedAt: new Date(), sortOrder: i },
    });
  }
  console.log(`[seed-answers] created ${answers.length} answer-library entries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
