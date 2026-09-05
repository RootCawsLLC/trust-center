import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/admin/ui";
import { requireOwner } from "@/lib/session";
import { MODULES } from "@/lib/permissions";
import { getAbacAttributeOptions } from "@/lib/abac";
import { GroupManager, type AdminGroup } from "./GroupManager";

export const dynamic = "force-dynamic";

function asScopes(v: unknown): Record<string, string[]> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, string[]> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (Array.isArray(val)) out[k] = val.filter((x): x is string => typeof x === "string");
  }
  return out;
}

export default async function GroupsPage() {
  await requireOwner();
  const [groups, attributes] = await Promise.all([
    prisma.group.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { users: true } } } }),
    getAbacAttributeOptions(),
  ]);

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
    attributeScopes: asScopes(g.attributeScopes),
  }));

  return (
    <div>
      <PageHeader
        title="Groups & permissions"
        description="Assign users to a group to inherit a default role and access scope, then fine-tune what each group can do per section — no access, view only, or edit."
      />
      <GroupManager groups={items} modules={MODULES} attributes={attributes} />
    </div>
  );
}
