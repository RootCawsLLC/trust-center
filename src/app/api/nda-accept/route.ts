import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ndaAcceptSchema } from "@/lib/validation";
import { logAudit, clientIpFromHeaders } from "@/lib/audit";
import { resolveDownloadAccess } from "@/lib/access";
import { limitByIp } from "@/lib/ratelimit";

export async function POST(req: Request) {
  const _rl = limitByIp(req, "nda_accept", 20, 60_000);
  if (_rl) return _rl;
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

  // NDA signed → resolve access (issue a grant, or route through the approval
  // gate in manual mode).
  const result = await resolveDownloadAccess(request, request.document);
  return NextResponse.json(result);
}
