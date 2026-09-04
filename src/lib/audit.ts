import { prisma } from "./prisma";

export type AuditInput = {
  action: string;
  actorUserId?: string | null;
  actorEmail?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
};

// Append-only audit record. AuditLog is one of the immutable ledger tables, so
// this can only ever add — never edit or remove — history.
export async function logAudit(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: input.action,
      actorUserId: input.actorUserId ?? null,
      actorEmail: input.actorEmail ?? null,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      metadata: (input.metadata ?? undefined) as never,
      ipAddress: input.ipAddress ?? null,
    },
  });
}

export function clientIpFromHeaders(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip");
}
