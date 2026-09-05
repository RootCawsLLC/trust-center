import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { grantExpiryDate, getOrgSettings } from "@/lib/settings";

// Issue a fresh, time-limited download grant for a request (expiring access).
export async function issueGrant(downloadRequestId: string) {
  return prisma.downloadGrant.create({
    data: { token: nanoid(40), downloadRequestId, expiresAt: await grantExpiryDate() },
  });
}

// Evaluate a domain against the auto-approval / auto-deny rules.
export async function evaluateDomainRule(domain: string): Promise<"approve" | "deny" | null> {
  if (!domain) return null;
  const rule = await prisma.accessRule.findUnique({ where: { domain: domain.toLowerCase() } });
  if (!rule) return null;
  return rule.decision === "deny" ? "deny" : "approve";
}

// Once a request has cleared the NDA requirement (signed, or bypassed), decide
// whether to issue a grant immediately or route it through the approval gate.
// Shared by the public-doc, customer-bypass, and post-NDA paths.
export async function resolveDownloadAccess(
  request: { id: string; emailDomain: string },
  doc: { visibility: string; fileName: string },
): Promise<{ status: "ready" | "pending" | "denied"; token?: string; fileName?: string }> {
  const { approvalMode } = await getOrgSettings();
  if (doc.visibility === "PRIVATE" && approvalMode === "manual") {
    const rule = await evaluateDomainRule(request.emailDomain);
    if (rule === "deny") {
      await prisma.accessApproval.create({ data: { downloadRequestId: request.id, status: "auto-denied", reason: "Auto-denied by domain rule", decidedAt: new Date() } });
      return { status: "denied" };
    }
    if (rule !== "approve") {
      await prisma.accessApproval.create({ data: { downloadRequestId: request.id, status: "pending" } });
      return { status: "pending" };
    }
    await prisma.accessApproval.create({ data: { downloadRequestId: request.id, status: "auto-approved", reason: "Auto-approved by domain rule", decidedAt: new Date() } });
  }
  const grant = await issueGrant(request.id);
  return { status: "ready", token: grant.token, fileName: doc.fileName };
}
