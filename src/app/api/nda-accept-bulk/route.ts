import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import { bulkNdaAcceptSchema } from "@/lib/validation";
import { logAudit, clientIpFromHeaders } from "@/lib/audit";

const GRANT_TTL_MINUTES = 15;

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bulkNdaAcceptSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const { batchId, signerName } = parsed.data;

  const requests = await prisma.downloadRequest.findMany({
    where: { batchId },
    include: { ndaAcceptance: true },
  });
  if (requests.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const nda = await prisma.ndaTemplate.findFirst({
    where: { isDefault: true, isActive: true },
  });
  if (!nda) return NextResponse.json({ error: "nda_unavailable" }, { status: 409 });

  const ip = clientIpFromHeaders(req.headers);
  const userAgent = req.headers.get("user-agent");
  const bodyHash = crypto
    .createHash("sha256")
    .update(nda.bodyMarkdown, "utf8")
    .digest("hex");
  const requesterEmail = requests[0].requesterEmail;

  // One signing → an immutable NDA acceptance for each private document's row.
  for (const r of requests) {
    if (r.ndaRequired && !r.ndaAcceptance) {
      await prisma.ndaAcceptance.create({
        data: {
          downloadRequestId: r.id,
          ndaTemplateId: nda.id,
          ndaTemplateName: nda.name,
          ndaBodyHash: bodyHash,
          signerName: signerName.trim(),
          signerEmail: requesterEmail,
          ipAddress: ip,
          userAgent,
        },
      });
    }
  }

  await logAudit({
    action: "BULK_NDA_ACCEPT",
    actorEmail: requesterEmail,
    ipAddress: ip,
    metadata: { batchId, ndaBodyHash: bodyHash, ndaTemplate: nda.name },
  });

  const existing = await prisma.bulkDownload.findFirst({ where: { batchId } });
  const grant =
    existing ??
    (await prisma.bulkDownload.create({
      data: {
        token: nanoid(40),
        batchId,
        requesterEmail,
        documentIds: requests.map((r) => r.documentId),
        expiresAt: new Date(Date.now() + GRANT_TTL_MINUTES * 60_000),
      },
    }));

  return NextResponse.json({ status: "ready", token: grant.token, count: requests.length });
}
