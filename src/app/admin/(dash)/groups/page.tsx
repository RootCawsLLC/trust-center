import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { ContentManager } from "@/components/admin/ContentManager";
import { saveGroup, deleteGroup } from "../access-actions";
import { requireOwner } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  await requireOwner();
  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { users: true } } },
  });
  return (
    <div>
      <PageHeader
        title="Groups"
        description="Assign users to a group (Legal, Sales, InfoSec…) to inherit a default role. Per-user overrides are set on the Users page."
      />
      <ContentManager
        newLabel="New group"
        items={groups.map((g) => ({
          id: g.id,
          name: g.name,
          description: g.description ?? "",
          defaultRole: g.defaultRole,
          members: g._count.users,
        }))}
        columns={[
          { key: "name", label: "Group" },
          { key: "defaultRole", label: "Default role" },
          { key: "members", label: "Members" },
        ]}
        fields={[
          { name: "name", label: "Name", type: "text", required: true, placeholder: "InfoSec" },
          {
            name: "defaultRole",
            label: "Default role",
            type: "select",
            options: [
              { value: "VIEWER", label: "Viewer" },
              { value: "ADMIN", label: "Admin" },
              { value: "OWNER", label: "Owner" },
            ],
          },
          { name: "description", label: "Description", type: "text", full: true },
        ]}
        saveAction={saveGroup}
        deleteAction={deleteGroup}
      />
    </div>
  );
}
