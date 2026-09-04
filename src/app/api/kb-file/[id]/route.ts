import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getObject } from "@/lib/storage";

// Public: knowledge-base attachments are public trust-center content.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const article = await prisma.knowledgeArticle.findFirst({
    where: { id, isPublished: true, fileStorageKey: { not: null } },
  });
  if (!article?.fileStorageKey) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  try {
    const obj = await getObject(article.fileStorageKey);
    return new NextResponse(new Uint8Array(obj.body), {
      status: 200,
      headers: {
        "Content-Type": obj.contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${article.fileName ?? "document"}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502 });
  }
}
