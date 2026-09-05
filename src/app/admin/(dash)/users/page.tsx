import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/session";
import { PageHeader } from "@/components/admin/ui";
import { getAbacAttributeOptions } from "@/lib/abac";
import { UserManager, type AdminUser } from "./UserManager";

export const dynamic = "force-dynamic";

function asScopes(v: unknown): Record<string, string[]> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, string[]> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (Array.isArray(val)) out[k] = val.filter((x): x is string => typeof x === "string");
  }
  return out;
}

export default async function UsersPage() {
  await requireOwner();

  const [users, groups, attributes] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, defaultRole: true } }),
    getAbacAttributeOptions(),
  ]);
  const items: AdminUser[] = users.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    groupId: u.groupId,
    isActive: u.isActive,
    hasPassword: Boolean(u.passwordHash),
    createdAt: u.createdAt.toISOString(),
    attributeScopes: asScopes(u.attributeScopes),
  }));

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage who can access the admin console and what they can do. Assign a group to inherit its role and access scope, or set per-user overrides."
      />
      <UserManager users={items} groups={groups} attributes={attributes} />
    </div>
  );
}
