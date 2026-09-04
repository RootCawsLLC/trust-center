import { NextResponse } from "next/server";
import JSZip from "jszip";
import { prisma } from "@/lib/prisma";
import { getObject } from "@/lib/storage";
import { logAudit, clientIpFromHeaders } from "@/lib/audit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const grant = await prisma.bulkDownload.findUnique({ where: { token } });
  if (!grant) return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  if (grant.expiresAt.getTime() < Date.now())
    return NextResponse.json({ error: "expired" }, { status: 410 });

  const docs = await prisma.document.findMany({
    where: { id: { in: grant.documentIds }, isPublished: true },
  });

  // Defense in depth: every private document in the batch must have a recorded
  // NDA acceptance from this requester before it can go in the ZIP.
  const privateDocs = docs.filter((d) => d.visibility === "PRIVATE");
  if (privateDocs.length > 0) {
    const accepted = await prisma.downloadRequest.findMany({
      where: {
        batchId: grant.batchId,
        documentId: { in: privateDocs.map((d) => d.id) },
        ndaAcceptance: { isNot: null },
      },
      select: { documentId: true },
    });
    const okIds = new Set(accepted.map((a) => a.documentId));
    if (privateDocs.some((d) => !okIds.has(d.id))) {
      return NextResponse.json({ error: "nda_required" }, { status: 403 });
    }
  }

  const zip = new JSZip();
  const used = new Map<string, number>();
  for (const doc of docs) {
    try {
      const obj = await getObject(doc.storageKey);
      // De-dupe filenames within the archive.
      let name = doc.fileName;
      const n = used.get(name) ?? 0;
      if (n > 0) {
        const dot = name.lastIndexOf(".");
        name = dot === -1 ? `${name} (${n})` : `${name.slice(0, dot)} (${n})${name.slice(dot)}`;
      }
      used.set(doc.fileName, n + 1);
      zip.file(name, obj.body);
    } catch {
      // Skip a missing blob rather than failing the whole archive.
    }
  }

  const buf = await zip.generateAsync({ type: "nodebuffer" });

  await prisma.bulkDownload.update({
    where: { id: grant.id },
    data: { usedAt: new Date(), downloadCount: { increment: 1 } },
  });

  await logAudit({
    action: "DOWNLOAD_ZIP",
    actorEmail: grant.requesterEmail,
    ipAddress: clientIpFromHeaders(req.headers),
    metadata: { batchId: grant.batchId, count: docs.length },
  });

  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="trust-center-documents.zip"`,
      "Content-Length": String(buf.length),
      "Cache-Control": "no-store",
    },
  });
}
