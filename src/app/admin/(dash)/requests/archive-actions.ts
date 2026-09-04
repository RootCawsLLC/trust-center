"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireWrite } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { AuthzError } from "@/lib/rbac";

export type ActionResult = { ok: true; count: number } | { ok: false; error: string };

// Archive hides requests from the working view. The immutable DownloadRequest rows
// are never touched — we only insert markers into RequestArchive.
export async function archiveRequests(ids: string[]): Promise<ActionResult> {
  let session;
  try {
    session = await requireWrite();
  } catch (e) {
    return { ok: false, error: e instanceof AuthzError ? e.message : "Unauthorized" };
  }
  const clean = [...new Set(ids)].filter(Boolean).slice(0, 2000);
  if (clean.length === 0) return { ok: false, error: "Nothing to archive." };

  const res = await prisma.requestArchive.createMany({
    data: clean.map((downloadRequestId) => ({
      downloadRequestId,
      archivedById: session.user.id,
      archivedByEmail: session.user.email,
    })),
    skipDuplicates: true,
  });

  await logAudit({
    action: "REQUEST_ARCHIVE",
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    targetType: "DownloadRequest",
    metadata: { count: res.count },
  });
  revalidatePath("/admin/requests");
  return { ok: true, count: res.count };
}

export async function unarchiveRequests(ids: string[]): Promise<ActionResult> {
  let session;
  try {
    session = await requireWrite();
  } catch (e) {
    return { ok: false, error: e instanceof AuthzError ? e.message : "Unauthorized" };
  }
  const clean = [...new Set(ids)].filter(Boolean).slice(0, 2000);
  const res = await prisma.requestArchive.deleteMany({
    where: { downloadRequestId: { in: clean } },
  });
  await logAudit({
    action: "REQUEST_UNARCHIVE",
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    targetType: "DownloadRequest",
    metadata: { count: res.count },
  });
  revalidatePath("/admin/requests");
  return { ok: true, count: res.count };
}
