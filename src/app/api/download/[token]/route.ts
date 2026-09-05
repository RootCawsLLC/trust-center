import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getObject } from "@/lib/storage";
import { logAudit, clientIpFromHeaders } from "@/lib/audit";
import { getOrgSettings } from "@/lib/settings";
import { watermarkPdf, isPdf } from "@/lib/watermark";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const grant = await prisma.downloadGrant.findUnique({
    where: { token },
    include: {
      downloadRequest: {
        include: { document: true, ndaAcceptance: true },
      },
    },
  });

  if (!grant) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }
  if (grant.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }

  const request = grant.downloadRequest;
  const doc = request.document;

  // Defense in depth: a private doc must have a recorded NDA acceptance.
  if (doc.visibility === "PRIVATE" && !request.ndaAcceptance) {
    return NextResponse.json({ error: "nda_required" }, { status: 403 });
  }

  let object;
  try {
    object = await getObject(doc.storageKey);
  } catch {
    return NextResponse.json({ error: "file_missing" }, { status: 404 });
  }

  // Per-viewer watermark on confidential PDFs (best-effort; fall back to the
  // original bytes if stamping fails).
  const ip = clientIpFromHeaders(req.headers);
  const userAgent = req.headers.get("user-agent");
  const { watermarkEnabled } = await getOrgSettings();
  let body = new Uint8Array(object.body);
  let watermarked = false;
  if (watermarkEnabled && doc.visibility === "PRIVATE" && isPdf(object.contentType, doc.fileName)) {
    try {
      const label = `${request.requesterEmail} · ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · Confidential`;
      // Copy into a fresh ArrayBuffer-backed Uint8Array so it satisfies BodyInit.
      body = new Uint8Array(await watermarkPdf(new Uint8Array(object.body), label));
      watermarked = true;
    } catch {
      body = new Uint8Array(object.body);
    }
  }

  // usedAt / downloadCount live on the mutable grant, not the immutable ledger.
  await prisma.downloadGrant.update({
    where: { id: grant.id },
    data: { usedAt: new Date(), downloadCount: { increment: 1 } },
  });

  // Per-viewer download event (auditor-ready trail).
  await prisma.downloadEvent.create({
    data: {
      downloadRequestId: request.id,
      documentId: doc.id,
      documentTitle: doc.title,
      requesterEmail: request.requesterEmail,
      emailDomain: request.emailDomain,
      kind: "single",
      watermarked,
      ipAddress: ip,
      userAgent,
    },
  });

  await logAudit({
    action: "DOWNLOAD_FILE",
    actorEmail: request.requesterEmail,
    targetType: "Document",
    targetId: doc.id,
    ipAddress: ip,
    metadata: { fileName: doc.fileName, watermarked },
  });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": object.contentType,
      "Content-Disposition": `attachment; filename="${doc.fileName.replace(/"/g, "")}"`,
      "Content-Length": String(body.length),
      "Cache-Control": "no-store",
    },
  });
}
