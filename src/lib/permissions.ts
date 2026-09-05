import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { AuthzError } from "@/lib/rbac";
import { redirect } from "next/navigation";

// Granular RBAC. Every admin section is a "module"; a group can grant each
// member "none" / "view" / "edit" per module, overlaying the coarse role.
export type Level = "none" | "view" | "edit";

export type ModuleDef = { key: string; label: string; ownerOnly?: boolean };

export const MODULES: ModuleDef[] = [
  { key: "documents", label: "Documents" },
  { key: "certifications", label: "Certifications" },
  { key: "risk-profile", label: "Risk profile" },
  { key: "shared-responsibility", label: "Shared responsibility" },
  { key: "compliance-calendar", label: "Compliance calendar" },
  { key: "requests", label: "Requests" },
  { key: "access", label: "Access requests" },
  { key: "leads", label: "Sales leads" },
  { key: "subscribers", label: "Subscribers" },
  { key: "tickets", label: "Tickets" },
  { key: "nda", label: "NDA templates" },
  { key: "subprocessors", label: "Subprocessors" },
  { key: "knowledge", label: "Knowledge base" },
  { key: "updates", label: "Updates" },
  { key: "attributes", label: "Attribute manager" },
  { key: "integrations", label: "Integrations" },
  { key: "metrics", label: "Metrics" },
  { key: "audit", label: "Audit log" },
  { key: "settings", label: "Settings" },
  { key: "users", label: "Users", ownerOnly: true },
  { key: "groups", label: "Groups", ownerOnly: true },
];

const MODULE_KEYS = new Set(MODULES.map((m) => m.key));
const OWNER_ONLY = new Set(MODULES.filter((m) => m.ownerOnly).map((m) => m.key));

// Role default (used when a group leaves a module unset): OWNER edits all,
// ADMIN edits everything except owner-only modules, VIEWER views the same.
function roleDefault(role: Role | undefined, moduleKey: string): Level {
  if (role === "OWNER") return "edit";
  if (OWNER_ONLY.has(moduleKey)) return "none";
  if (role === "ADMIN") return "edit";
  if (role === "VIEWER") return "view";
  return "none";
}

export type EffectivePermissions = {
  role: Role | undefined;
  isOwner: boolean;
  levels: Record<string, Level>;
};

function coerceLevel(v: unknown): Level | undefined {
  return v === "none" || v === "view" || v === "edit" ? v : undefined;
}

/**
 * Resolve the current user's effective per-module levels: the group matrix
 * overlaid on the role default. Owner-only modules always require OWNER,
 * regardless of any group grant (no privilege escalation via a group).
 */
export async function getEffectivePermissions(): Promise<EffectivePermissions> {
  const session = await getSession();
  const role = session?.user?.role as Role | undefined;
  const isOwner = role === "OWNER";

  let matrix: Record<string, unknown> = {};
  const userId = session?.user?.id;
  if (userId && !isOwner) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { group: { select: { permissions: true } } },
    });
    const perms = user?.group?.permissions;
    if (perms && typeof perms === "object" && !Array.isArray(perms)) {
      matrix = perms as Record<string, unknown>;
    }
  }

  const levels: Record<string, Level> = {};
  for (const m of MODULES) {
    if (OWNER_ONLY.has(m.key)) {
      levels[m.key] = isOwner ? "edit" : "none";
      continue;
    }
    levels[m.key] = coerceLevel(matrix[m.key]) ?? roleDefault(role, m.key);
  }
  return { role, isOwner, levels };
}

export function levelAllows(level: Level, need: "view" | "edit"): boolean {
  if (need === "view") return level === "view" || level === "edit";
  return level === "edit";
}

export function can(perms: EffectivePermissions, moduleKey: string, need: "view" | "edit"): boolean {
  const lvl = perms.levels[moduleKey] ?? "none";
  return levelAllows(lvl, need);
}

/**
 * Page/action guard. Redirects unauthenticated users to login, then throws
 * AuthzError (for actions) — or, in a page, callers use requireModuleView which
 * redirects instead of throwing.
 */
export async function requireModule(moduleKey: string, need: "view" | "edit") {
  const session = await getSession();
  if (!session?.user) redirect("/admin/login");
  if (!MODULE_KEYS.has(moduleKey)) throw new AuthzError("Unknown module.");
  const perms = await getEffectivePermissions();
  if (!can(perms, moduleKey, need)) {
    throw new AuthzError(need === "edit" ? "You don't have edit access to this section." : "You don't have access to this section.");
  }
  return session;
}

/** Page-level view guard: redirect to the dashboard if the user can't view. */
export async function requireModuleView(moduleKey: string) {
  const session = await getSession();
  if (!session?.user) redirect("/admin/login");
  const perms = await getEffectivePermissions();
  if (!can(perms, moduleKey, "view")) redirect("/admin");
  return session;
}
