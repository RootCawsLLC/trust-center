import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { ndaAcceptSchema } from "@/lib/validation";
import { logAudit, clientIpFromHeaders } from "@/lib/audit";

import { grantExpiryDate } from "@/lib/settings";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = ndaAcceptSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { requestId, signerName } = parsed.data;

  const request = await prisma.downloadRequest.findUnique({
    where: { id: requestId },
    include: { document: { include: { ndaTemplate: true } }, ndaAcceptance: true },
  });
  if (!request || !request.ndaRequired) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (request.ndaAcceptance) {
    return NextResponse.json({ error: "already_accepted" }, { status: 409 });
  }

  // Re-derive the applicable NDA server-side (never trust the client).
  const nda =
    request.document.ndaTemplate ??
    (await prisma.ndaTemplate.findFirst({
      where: { isDefault: true, isActive: true },
    }));
  if (!nda) {
    return NextResponse.json({ error: "nda_unavailable" }, { status: 409 });
  }

  const ip = clientIpFromHeaders(req.headers);
  const userAgent = req.headers.get("user-agent");
  const bodyHash = crypto
    .createHash("sha256")
    .update(nda.bodyMarkdown, "utf8")
    .digest("hex");

  // Immutable record of consent.
  await prisma.ndaAcceptance.create({
    data: {
      downloadRequestId: request.id,
      ndaTemplateId: nda.id,
      ndaTemplateName: nda.name,
      ndaBodyHash: bodyHash,
      signerName: signerName.trim(),
      signerEmail: request.requesterEmail,
      ipAddress: ip,
      userAgent,
    },
  });

  await logAudit({
    action: "NDA_ACCEPT",
    actorEmail: request.requesterEmail,
    targetType: "Document",
    targetId: request.documentId,
    ipAddress: ip,
    metadata: { ndaTemplate: nda.name, ndaBodyHash: bodyHash },
  });

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
    fileName: request.document.fileName,
  });
}
