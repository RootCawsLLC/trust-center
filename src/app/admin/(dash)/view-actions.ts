"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

export type ViewResult = { ok: true } | { ok: false; error: string };

export async function saveView(name: string, path: string, query: string): Promise<ViewResult> {
  const session = await requireSession();
  const n = name.trim().slice(0, 80);
  if (!n) return { ok: false, error: "Name required" };
  if (!path.startsWith("/admin/")) return { ok: false, error: "Invalid path" };
  await prisma.savedView.create({
    data: { userId: session.user.id, name: n, path, query: query.slice(0, 500) },
  });
  revalidatePath(path);
  return { ok: true };
}

export async function deleteView(id: string): Promise<ViewResult> {
  const session = await requireSession();
  await prisma.savedView.deleteMany({ where: { id, userId: session.user.id } });
  return { ok: true };
}
