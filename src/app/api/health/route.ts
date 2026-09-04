import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// App Runner health check. Returns 200 when the app can reach the database.
export async function GET() {
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "degraded" }, { status: 503 });
  }
}
