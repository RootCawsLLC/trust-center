import type { Role } from "@prisma/client";

// OWNER > ADMIN > VIEWER. Writes require ADMIN or OWNER; user management and
// destructive settings require OWNER.
const RANK: Record<Role, number> = { VIEWER: 1, ADMIN: 2, OWNER: 3 };

export function atLeast(role: Role | undefined | null, min: Role): boolean {
  if (!role) return false;
  return RANK[role] >= RANK[min];
}

export function canWrite(role: Role | undefined | null): boolean {
  return atLeast(role, "ADMIN");
}

export function canManageUsers(role: Role | undefined | null): boolean {
  return atLeast(role, "OWNER");
}

export class AuthzError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "AuthzError";
  }
}
