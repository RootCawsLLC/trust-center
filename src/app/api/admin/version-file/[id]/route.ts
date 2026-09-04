import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getObject } from "@/lib/storage";
import { getSession } from "@/lib/session";

// Admin-only: view a specific stored document version inline.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const v = await prisma.documentVersion.findUnique({ where: { id } });
  if (!v) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const obj = await getObject(v.storageKey);
    return new NextResponse(new Uint8Array(obj.body), {
      status: 200,
      headers: {
        "Content-Type": obj.contentType || v.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${v.fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
