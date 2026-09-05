"use client";

import { useState } from "react";
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
  KeyRound,
  ClipboardList,
  Library,
  Download,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ size?: number }>; exact?: boolean; ownerOnly?: boolean };
type NavGroup = { label: string | null; items: NavItem[] };

// Grouped, collapsible navigation. Top items are ungrouped; the rest roll up
// under headings so the sidebar stays short.
const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { href: "/admin/metrics", label: "Metrics", icon: BarChart3 },
    ],
  },
  {
    label: "Trust content",
    items: [
      { href: "/admin/documents", label: "Documents", icon: FileText },
      { href: "/admin/certifications", label: "Certifications", icon: Award },
      { href: "/admin/risk-profile", label: "Risk profile", icon: Gauge },
      { href: "/admin/shared-responsibility", label: "Shared responsibility", icon: SplitSquareHorizontal },
      { href: "/admin/compliance-calendar", label: "Compliance calendar", icon: CalendarDays },
      { href: "/admin/subprocessors", label: "Subprocessors", icon: Network },
      { href: "/admin/knowledge", label: "FAQ", icon: BookOpen },
      { href: "/admin/updates", label: "Updates", icon: Megaphone },
    ],
  },
  {
    label: "Requests & access",
    items: [
      { href: "/admin/requests", label: "Requests", icon: Inbox },
      { href: "/admin/access", label: "Access requests", icon: KeyRound },
      { href: "/admin/downloads", label: "Download trail", icon: Download },
      { href: "/admin/leads", label: "Sales leads", icon: Target },
      { href: "/admin/subscribers", label: "Subscribers", icon: Bell },
      { href: "/admin/nda", label: "NDA templates", icon: FileSignature },
    ],
  },
  {
    label: "Support",
    items: [
      { href: "/admin/tickets", label: "Tickets", icon: LifeBuoy },
      { href: "/admin/questionnaires", label: "Questionnaires", icon: ClipboardList },
      { href: "/admin/answers", label: "Answer library", icon: Library },
    ],
  },
  {
    label: "Administration",
    items: [
      { href: "/admin/users", label: "Users", icon: Users, ownerOnly: true },
      { href: "/admin/groups", label: "Groups", icon: UsersRound, ownerOnly: true },
      { href: "/admin/integrations", label: "Integrations", icon: Plug },
      { href: "/admin/attributes", label: "Attribute manager", icon: Tags },
      { href: "/admin/audit", label: "Audit log", icon: ScrollText },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
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

  function canView(href: string): boolean {
    if (href === "/admin") return true;
    const mod = href.slice("/admin/".length);
    if (!levels) return true;
    const lvl = levels[mod];
    return lvl === "view" || lvl === "edit";
  }

  function isActive(item: NavItem) {
    return item.exact ? pathname === item.href : pathname.startsWith(item.href);
  }

  // Which groups start open: the one containing the active route (others collapsed).
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const g of NAV_GROUPS) {
      if (g.label) init[g.label] = g.items.some((i) => (i.exact ? pathname === i.href : pathname.startsWith(i.href)));
    }
    return init;
  });

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <span className="text-sm font-semibold text-ink">Trust Center</span>
        <p className="text-xs text-ink-faint">Vendor admin</p>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
        {NAV_GROUPS.map((group, gi) => {
          const items = group.items.filter((i) => (!i.ownerOnly || role === "OWNER") && canView(i.href));
          if (items.length === 0) return null;

          if (!group.label) {
            return (
              <div key={gi} className="space-y-0.5">
                {items.map((item) => (
                  <NavLink key={item.href} item={item} active={isActive(item)} />
                ))}
              </div>
            );
          }

          const isOpen = open[group.label] ?? false;
          const hasActive = items.some((i) => isActive(i));
          return (
            <div key={group.label} className="pt-1">
              <button
                onClick={() => setOpen((o) => ({ ...o, [group.label!]: !isOpen }))}
                className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint transition hover:text-ink"
              >
                <span className={cn(hasActive && "text-brand-700")}>{group.label}</span>
                <ChevronDown size={13} className={cn("transition", isOpen ? "rotate-0" : "-rotate-90")} />
              </button>
              {isOpen && (
                <div className="mt-0.5 space-y-0.5">
                  {items.map((item) => (
                    <NavLink key={item.href} item={item} active={isActive(item)} />
                  ))}
                </div>
              )}
            </div>
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

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition",
        active ? "bg-brand-50 text-brand-700" : "text-ink-soft hover:bg-slate-100",
      )}
    >
      <Icon size={16} />
      {item.label}
    </Link>
  );
}
