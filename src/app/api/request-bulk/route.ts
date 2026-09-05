import { NextResponse } from "next/server";
import { limitByIp } from "@/lib/ratelimit";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { bulkRequestSchema } from "@/lib/validation";
import { matchCustomerByDomain, isFreemail } from "@/lib/salesforce";
import { logAudit, clientIpFromHeaders } from "@/lib/audit";
import { domainFromEmail } from "@/lib/utils";

import { grantExpiryDate } from "@/lib/settings";

export async function POST(req: Request) {
  const _rl = limitByIp(req, "request_bulk", 10, 60_000);
  if (_rl) return _rl;
  const json = await req.json().catch(() => null);
  const parsed = bulkRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const docs = await prisma.document.findMany({
    where: { id: { in: input.documentIds }, isPublished: true },
  });
  if (docs.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ip = clientIpFromHeaders(req.headers);
  const userAgent = req.headers.get("user-agent");
  const email = input.requesterEmail.toLowerCase().trim();
  const domain = domainFromEmail(email);
  const match = await matchCustomerByDomain(domain);
  const classification = match.isCustomer ? "CUSTOMER" : "LEAD";
  const anyPrivate = docs.some((d) => d.visibility === "PRIVATE");
  const batchId = nanoid(20);

  // Immutable capture: one request row per document in the batch.
  await prisma.downloadRequest.createMany({
    data: docs.map((doc) => ({
      documentId: doc.id,
      documentTitle: doc.title,
      documentVersion: doc.version,
      documentCategory: doc.category,
      documentVisibility: doc.visibility,
      requesterName: input.requesterName.trim(),
      requesterEmail: email,
      emailDomain: domain,
      orgName: input.orgName.trim(),
      country: input.country.trim(),
      ipAddress: ip,
      userAgent,
      ndaRequired: doc.visibility === "PRIVATE",
      batchId,
      classification: classification as "CUSTOMER" | "LEAD",
      matchedCustomerId: match.customerId,
      matchedCustomerName: match.customerName,
    })),
  });

  if (!match.isCustomer && domain) {
    await prisma.salesLead.upsert({
      where: { emailDomain: domain },
      update: {
        lastSeenAt: new Date(),
        requestCount: { increment: docs.length },
        sampleOrgName: input.orgName.trim(),
        sampleCountry: input.country.trim(),
      },
      create: {
        emailDomain: domain,
        requestCount: docs.length,
        sampleOrgName: input.orgName.trim(),
        sampleCountry: input.country.trim(),
      },
    });
  }

  await logAudit({
    action: "BULK_REQUEST",
    actorEmail: email,
    ipAddress: ip,
    metadata: {
      batchId,
      count: docs.length,
      classification,
      domain,
      freemail: isFreemail(domain),
      anyPrivate,
    },
  });

  if (anyPrivate) {
    const nda = await prisma.ndaTemplate.findFirst({
      where: { isDefault: true, isActive: true },
    });
    if (!nda) return NextResponse.json({ error: "nda_unavailable" }, { status: 409 });
    return NextResponse.json({
      status: "nda",
      batchId,
      count: docs.length,
      nda: { id: nda.id, name: nda.name, bodyMarkdown: nda.bodyMarkdown, contentHtml: nda.contentHtml },
    });
  }

  const grant = await prisma.bulkDownload.create({
    data: {
      token: nanoid(40),
      batchId,
      requesterEmail: email,
      documentIds: docs.map((d) => d.id),
      expiresAt: await grantExpiryDate(),
    },
  });

  return NextResponse.json({ status: "ready", token: grant.token, count: docs.length });
}
