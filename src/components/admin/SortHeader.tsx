"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

// URL-driven sortable column header for server-rendered tables. Clicking sets
// ?sort=<key>&dir=asc|desc; the page reads these into its orderBy.
export function SortHeader({ label, sortKey }: { label: string; sortKey: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const cur = params.get("sort");
  const dir = params.get("dir") === "desc" ? "desc" : "asc";
  const active = cur === sortKey;

  function toggle() {
    const next = new URLSearchParams(params.toString());
    if (active) {
      next.set("dir", dir === "asc" ? "desc" : "asc");
    } else {
      next.set("sort", sortKey);
      next.set("dir", "asc");
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <button onClick={toggle} className="inline-flex items-center gap-1 font-medium hover:text-ink">
      {label}
      {active ? (
        dir === "asc" ? <ChevronUp size={13} /> : <ChevronDown size={13} />
      ) : (
        <ChevronsUpDown size={13} className="text-slate-300" />
      )}
    </button>
  );
}
