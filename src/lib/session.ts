import { redirect } from "next/navigation";
import { auth } from "./auth";
import { canManageUsers, canWrite, AuthzError } from "./rbac";

export async function getSession() {
  return auth();
}

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  return session;
}

export async function requireWrite() {
  const session = await requireSession();
  if (!canWrite(session.user.role)) {
    throw new AuthzError("This action requires Admin or Owner.");
  }
  return session;
}

export async function requireOwner() {
  const session = await requireSession();
  if (!canManageUsers(session.user.role)) {
    throw new AuthzError("This action requires Owner.");
  }
  return session;
}
