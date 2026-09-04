"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { archiveRequests, unarchiveRequests } from "@/app/admin/(dash)/requests/archive-actions";
import { cn } from "@/lib/utils";

export function RequestArchiveBar({ view, ids }: { view: string; ids: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function setView(v: string) {
    const next = new URLSearchParams(params.toString());
    if (v === "active") next.delete("view");
    else next.set("view", v);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

  function doArchive() {
    if (ids.length === 0) return;
    if (!confirm(`Archive ${ids.length} request(s) from the working view? The immutable records are preserved and can be restored.`)) return;
    start(async () => {
      await archiveRequests(ids);
      router.refresh();
    });
  }
  function doUnarchive() {
    if (ids.length === 0) return;
    start(async () => {
      await unarchiveRequests(ids);
      router.refresh();
    });
  }

  const cur = view || "active";
  const tabs = [
    { key: "active", label: "Active" },
    { key: "archived", label: "Archived" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-sm">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setView(t.key)}
            className={cn(
              "rounded-md px-3 py-1 font-medium transition",
              cur === t.key ? "bg-brand-600 text-white" : "text-ink-soft hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {cur === "archived" ? (
        <button className="btn-secondary text-sm" onClick={doUnarchive} disabled={pending || ids.length === 0}>
          <ArchiveRestore size={15} /> Restore {ids.length} shown
        </button>
      ) : (
        <button className="btn-secondary text-sm" onClick={doArchive} disabled={pending || ids.length === 0}>
          <Archive size={15} /> Archive {ids.length} matching
        </button>
      )}
    </div>
  );
}
