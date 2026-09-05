import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ndaAcceptSchema } from "@/lib/validation";
import { logAudit, clientIpFromHeaders } from "@/lib/audit";
import { getOrgSettings } from "@/lib/settings";
import { issueGrant, evaluateDomainRule } from "@/lib/access";

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

  // Approval gate. In "manual" mode a private-doc request needs admin approval
  // before a grant is issued, unless a domain rule auto-approves or auto-denies.
  const { approvalMode } = await getOrgSettings();
  if (approvalMode === "manual") {
    const rule = await evaluateDomainRule(request.emailDomain);
    if (rule === "deny") {
      await prisma.accessApproval.create({
        data: { downloadRequestId: request.id, status: "auto-denied", reason: "Auto-denied by domain rule", decidedAt: new Date() },
      });
      await logAudit({ action: "ACCESS_AUTO_DENIED", actorEmail: request.requesterEmail, targetType: "DownloadRequest", targetId: request.id, ipAddress: ip, metadata: { domain: request.emailDomain } });
      return NextResponse.json({ status: "denied" });
    }
    if (rule !== "approve") {
      // Pending manual review — no grant yet.
      await prisma.accessApproval.create({ data: { downloadRequestId: request.id, status: "pending" } });
      await logAudit({ action: "ACCESS_PENDING", actorEmail: request.requesterEmail, targetType: "DownloadRequest", targetId: request.id, ipAddress: ip, metadata: { domain: request.emailDomain } });
      return NextResponse.json({ status: "pending" });
    }
    // Auto-approved by domain rule → fall through and issue the grant.
    await prisma.accessApproval.create({
      data: { downloadRequestId: request.id, status: "auto-approved", reason: "Auto-approved by domain rule", decidedAt: new Date() },
    });
  }

  const grant = await issueGrant(request.id);

  return NextResponse.json({
    status: "ready",
    token: grant.token,
    fileName: request.document.fileName,
  });
}
