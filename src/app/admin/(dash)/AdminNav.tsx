"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FileText,
  Inbox,
  Target,
  FileSignature,
  Users,
  ScrollText,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/documents", label: "Documents", icon: FileText },
  { href: "/admin/requests", label: "Requests", icon: Inbox },
  { href: "/admin/leads", label: "Sales leads", icon: Target },
  { href: "/admin/nda", label: "NDA templates", icon: FileSignature },
  { href: "/admin/users", label: "Users", icon: Users, ownerOnly: true },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav({
  role,
  email,
  name,
}: {
  role?: string;
  email?: string | null;
  name?: string | null;
}) {
  const pathname = usePathname();
  const isOwner = role === "OWNER";

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <span className="text-sm font-semibold text-ink">Trust Center</span>
        <p className="text-xs text-ink-faint">Vendor admin</p>
      </div>
      <nav className="flex-1 space-y-0.5 px-2">
        {NAV.filter((i) => !i.ownerOnly || isOwner).map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-soft hover:bg-slate-100",
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <div className="mb-2 px-1">
          <p className="truncate text-sm font-medium text-ink">{name ?? email}</p>
          <p className="text-xs text-ink-faint">{role}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="btn-ghost w-full justify-start text-sm"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </div>
  );
}
