import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { downloadRequestSchema } from "@/lib/validation";
import { matchCustomerByDomain, isFreemail } from "@/lib/salesforce";
import { logAudit, clientIpFromHeaders } from "@/lib/audit";
import { domainFromEmail } from "@/lib/utils";

import { grantExpiryDate } from "@/lib/settings";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = downloadRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const doc = await prisma.document.findFirst({
    where: { id: input.documentId, isPublished: true },
    include: { ndaTemplate: true },
  });
  if (!doc) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ip = clientIpFromHeaders(req.headers);
  const userAgent = req.headers.get("user-agent");
  const email = input.requesterEmail.toLowerCase().trim();
  const domain = domainFromEmail(email);
  const match = await matchCustomerByDomain(domain);
  const classification = match.isCustomer ? "CUSTOMER" : "LEAD";
  const ndaRequired = doc.visibility === "PRIVATE";

  // Immutable capture of the request.
  const request = await prisma.downloadRequest.create({
    data: {
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
      ndaRequired,
      classification,
      matchedCustomerId: match.customerId,
      matchedCustomerName: match.customerName,
    },
  });

  // Non-customers become / update a sales lead (derived from the ledger).
  if (!match.isCustomer && domain) {
    await prisma.salesLead.upsert({
      where: { emailDomain: domain },
      update: {
        lastSeenAt: new Date(),
        requestCount: { increment: 1 },
        sampleOrgName: input.orgName.trim(),
        sampleCountry: input.country.trim(),
      },
      create: {
        emailDomain: domain,
        requestCount: 1,
        sampleOrgName: input.orgName.trim(),
        sampleCountry: input.country.trim(),
      },
    });
  }

  await logAudit({
    action: "DOWNLOAD_REQUEST",
    actorEmail: email,
    targetType: "Document",
    targetId: doc.id,
    ipAddress: ip,
    metadata: {
      classification,
      domain,
      freemail: isFreemail(domain),
      ndaRequired,
      matchedCustomer: match.customerName,
    },
  });

  if (ndaRequired) {
    const nda = doc.ndaTemplate
      ? doc.ndaTemplate
      : await prisma.ndaTemplate.findFirst({
          where: { isDefault: true, isActive: true },
        });
    if (!nda) {
      return NextResponse.json(
        { error: "nda_unavailable" },
        { status: 409 },
      );
    }
    return NextResponse.json({
      status: "nda",
      requestId: request.id,
      nda: { id: nda.id, name: nda.name, bodyMarkdown: nda.bodyMarkdown, contentHtml: nda.contentHtml },
    });
  }

  // Public document: issue a download grant immediately.
  const grant = await prisma.downloadGrant.create({
    data: {
      token: nanoid(40),
      downloadRequestId: request.id,
      expiresAt: await grantExpiryDate(),
    },
  });

  return NextResponse.json({
    status: "ready",
    token: grant.token,
    fileName: doc.fileName,
  });
}
