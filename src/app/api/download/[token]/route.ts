import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getObject } from "@/lib/storage";
import { logAudit, clientIpFromHeaders } from "@/lib/audit";

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

  // usedAt / downloadCount live on the mutable grant, not the immutable ledger.
  await prisma.downloadGrant.update({
    where: { id: grant.id },
    data: { usedAt: new Date(), downloadCount: { increment: 1 } },
  });

  await logAudit({
    action: "DOWNLOAD_FILE",
    actorEmail: request.requesterEmail,
    targetType: "Document",
    targetId: doc.id,
    ipAddress: clientIpFromHeaders(req.headers),
    metadata: { fileName: doc.fileName },
  });

  return new NextResponse(new Uint8Array(object.body), {
    status: 200,
    headers: {
      "Content-Type": object.contentType,
      "Content-Disposition": `attachment; filename="${doc.fileName.replace(/"/g, "")}"`,
      "Content-Length": String(object.body.length),
      "Cache-Control": "no-store",
    },
  });
}
