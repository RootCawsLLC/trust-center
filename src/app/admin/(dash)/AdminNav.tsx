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
  ExternalLink,
  Network,
  BookOpen,
  Megaphone,
  BarChart3,
  Award,
  Gauge,
  SplitSquareHorizontal,
  CalendarDays,
  UsersRound,
  Plug,
  LifeBuoy,
  Tags,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/metrics", label: "Metrics", icon: BarChart3 },
  { href: "/admin/documents", label: "Documents", icon: FileText },
  { href: "/admin/certifications", label: "Certifications", icon: Award },
  { href: "/admin/risk-profile", label: "Risk profile", icon: Gauge },
  { href: "/admin/shared-responsibility", label: "Shared responsibility", icon: SplitSquareHorizontal },
  { href: "/admin/compliance-calendar", label: "Compliance calendar", icon: CalendarDays },
  { href: "/admin/requests", label: "Requests", icon: Inbox },
  { href: "/admin/leads", label: "Sales leads", icon: Target },
  { href: "/admin/subscribers", label: "Subscribers", icon: Bell },
  { href: "/admin/tickets", label: "Tickets", icon: LifeBuoy },
  { href: "/admin/nda", label: "NDA templates", icon: FileSignature },
  { href: "/admin/subprocessors", label: "Subprocessors", icon: Network },
  { href: "/admin/knowledge", label: "Knowledge base", icon: BookOpen },
  { href: "/admin/updates", label: "Updates", icon: Megaphone },
  { href: "/admin/users", label: "Users", icon: Users, ownerOnly: true },
  { href: "/admin/groups", label: "Groups", icon: UsersRound, ownerOnly: true },
  { href: "/admin/integrations", label: "Integrations", icon: Plug },
  { href: "/admin/attributes", label: "Attribute manager", icon: Tags },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav({
  role,
  email,
  name,
  levels,
}: {
  role?: string;
  email?: string | null;
  name?: string | null;
  levels?: Record<string, string>;
}) {
  const pathname = usePathname();

  // A nav item is visible when its module grants at least "view". The module key
  // is the path segment after /admin/ (the dashboard root has none → always on).
  function canView(href: string): boolean {
    if (href === "/admin") return true;
    const mod = href.slice("/admin/".length);
    if (!levels) return true; // no map passed → show all (fail-open only pre-wire)
    const lvl = levels[mod];
    return lvl === "view" || lvl === "edit";
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <span className="text-sm font-semibold text-ink">Trust Center</span>
        <p className="text-xs text-ink-faint">Vendor admin</p>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
        {NAV.filter((i) => canView(i.href)).map((item) => {
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
      <div className="px-2 pb-2">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-ink-soft transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
        >
          <ExternalLink size={16} /> External view
        </a>
      </div>
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
