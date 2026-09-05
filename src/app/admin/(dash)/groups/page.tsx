import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { requireOwner } from "@/lib/session";
import { MODULES } from "@/lib/permissions";
import { GroupManager, type AdminGroup } from "./GroupManager";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  await requireOwner();
  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });

  const items: AdminGroup[] = groups.map((g) => ({
    id: g.id,
    name: g.name,
    description: g.description ?? "",
    defaultRole: g.defaultRole,
    members: g._count.users,
    permissions:
      g.permissions && typeof g.permissions === "object" && !Array.isArray(g.permissions)
        ? (g.permissions as Record<string, "none" | "view" | "edit">)
        : {},
  }));

  return (
    <div>
      <PageHeader
        title="Groups & permissions"
        description="Assign users to a group to inherit a default role, then fine-tune what each group can do per section — no access, view only, or edit."
      />
      <GroupManager groups={items} modules={MODULES} />
    </div>
  );
}
