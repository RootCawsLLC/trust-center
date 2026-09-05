import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getObject } from "@/lib/storage";

// Public: the uploaded official NDA copy. Templates are shown to any visitor
// starting a private-document request, so the attached file is public content.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const tmpl = await prisma.ndaTemplate.findFirst({
    where: { id, isActive: true, fileStorageKey: { not: null } },
  });
  if (!tmpl?.fileStorageKey) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  try {
    const obj = await getObject(tmpl.fileStorageKey);
    return new NextResponse(new Uint8Array(obj.body), {
      status: 200,
      headers: {
        "Content-Type": obj.contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${tmpl.fileName ?? "nda"}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
