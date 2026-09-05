import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { grantExpiryDate } from "@/lib/settings";

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
