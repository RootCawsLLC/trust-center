import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/session";
import { PageHeader } from "@/components/admin/ui";
import { UserManager, type AdminUser } from "./UserManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireOwner();

  const [users, groups] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.group.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, defaultRole: true } }),
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
  }));

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage who can access the admin console and what they can do. Assign a group to inherit its role, or set a per-user override."
      />
      <UserManager users={items} groups={groups} />
    </div>
  );
}
