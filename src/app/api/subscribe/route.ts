import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { matchCustomerByDomain } from "@/lib/salesforce";
import { domainFromEmail } from "@/lib/utils";
import { logAudit, clientIpFromHeaders } from "@/lib/audit";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public: a visitor subscribes to trust-center change notifications.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase().slice(0, 200);
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "invalid_email" }, { status: 400 });

  const domain = domainFromEmail(email) ?? "";
  const match = await matchCustomerByDomain(domain);

  // Auto-confirm in this scaffold (a real build would send a confirm email).
  const existing = await prisma.subscriber.findUnique({ where: { email } });
  if (existing) {
    await prisma.subscriber.update({
      where: { email },
      data: { unsubscribedAt: null, confirmedAt: existing.confirmedAt ?? new Date(), isCustomer: match.isCustomer, matchedCustomerName: match.customerName ?? null },
    });
  } else {
    await prisma.subscriber.create({
      data: {
        email,
        emailDomain: domain,
        isCustomer: match.isCustomer,
        matchedCustomerName: match.customerName ?? null,
        token: nanoid(24),
        confirmedAt: new Date(),
      },
    });
  }

  await logAudit({
    action: "SUBSCRIBE",
    actorEmail: email,
    ipAddress: clientIpFromHeaders(req.headers),
    targetType: "Subscriber",
    metadata: { domain, matched: match.customerName ?? null },
  });

  return NextResponse.json({ ok: true });
}
