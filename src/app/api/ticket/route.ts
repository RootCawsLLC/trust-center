import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { matchCustomerByDomain } from "@/lib/salesforce";
import { domainFromEmail } from "@/lib/utils";
import { logAudit, clientIpFromHeaders } from "@/lib/audit";

export const dynamic = "force-dynamic";

// Public: a visitor submits a request for assistance (from the assistant fallback
// or a "contact us" action). Creates a ticket for the vendor team.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const question = String(body?.question ?? "").trim().slice(0, 4000);
  const requesterName = String(body?.requesterName ?? "").trim().slice(0, 120) || null;
  const requesterEmail = String(body?.requesterEmail ?? "").trim().toLowerCase().slice(0, 200) || null;
  if (!question) return NextResponse.json({ error: "empty" }, { status: 400 });

  const domain = requesterEmail ? domainFromEmail(requesterEmail) : null;
  const match = domain ? await matchCustomerByDomain(domain) : { customerName: null };

  const ticket = await prisma.ticket.create({
    data: {
      subject: question.slice(0, 80),
      question,
      requesterName,
      requesterEmail,
      emailDomain: domain,
      matchedCustomerName: match.customerName ?? null,
      source: "assistant",
      status: "open",
    },
  });

  await logAudit({
    action: "TICKET_CREATE",
    actorEmail: requesterEmail ?? undefined,
    ipAddress: clientIpFromHeaders(req.headers),
    targetType: "Ticket",
    targetId: ticket.id,
    metadata: { domain, matched: match.customerName ?? null },
  });

  return NextResponse.json({ ok: true });
}
