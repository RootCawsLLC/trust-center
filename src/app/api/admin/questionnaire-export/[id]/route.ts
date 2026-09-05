import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getEffectivePermissions, can } from "@/lib/permissions";

function csvCell(v: string): string {
  const needs = /[",\n]/.test(v);
  const escaped = v.replace(/"/g, '""');
  return needs ? `"${escaped}"` : escaped;
}

// Admin: export a questionnaire's approved/drafted answers as CSV.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const perms = await getEffectivePermissions();
  if (!can(perms, "questionnaires", "view")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const q = await prisma.questionnaire.findUnique({
    where: { id },
    include: { items: { orderBy: { rowIndex: "asc" } } },
  });
  if (!q) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const rows = [["Question", "Answer", "Status"]];
  for (const it of q.items) {
    rows.push([it.question, it.finalAnswer ?? it.draftAnswer ?? "", it.status]);
  }
  const csv = rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
  const safeName = q.name.replace(/[^\w.\- ]+/g, "_").slice(0, 80) || "questionnaire";

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
