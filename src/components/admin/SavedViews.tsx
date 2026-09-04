"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Bookmark, BookmarkPlus, X } from "lucide-react";
import { saveView, deleteView } from "@/app/admin/(dash)/view-actions";

export type SavedViewItem = { id: string; name: string; query: string };

export function SavedViews({ views }: { views: SavedViewItem[] }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const currentQuery = params.toString();

  function onSave() {
    const name = window.prompt("Name this view (e.g., 'Q2 2026 requests')");
    if (!name) return;
    startTransition(async () => {
      await saveView(name, pathname, currentQuery);
      router.refresh();
    });
  }

  function onDelete(id: string) {
    startTransition(async () => {
      await deleteView(id);
      router.refresh();
    });
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1.5 text-xs font-medium text-ink-faint">
        <Bookmark size={13} /> Saved views
      </span>
      {views.length === 0 && <span className="text-xs text-ink-faint">none yet</span>}
      {views.map((v) => (
        <span
          key={v.id}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs"
        >
          <Link
            href={v.query ? `${pathname}?${v.query}` : pathname}
            className="font-medium text-brand-700 hover:underline"
          >
            {v.name}
          </Link>
          <button
            onClick={() => onDelete(v.id)}
            className="text-slate-400 hover:text-red-600"
            aria-label="Delete view"
            disabled={pending}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <button onClick={onSave} className="btn-ghost text-xs" disabled={pending}>
        <BookmarkPlus size={13} /> Save current
      </button>
    </div>
  );
}
