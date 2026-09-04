import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Liveness check for App Runner: returns 200 as soon as the web server is up.
// Database connectivity is intentionally NOT gated here so a transient DB issue
// doesn't block deployment; DB health surfaces on the pages and in logs.
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
