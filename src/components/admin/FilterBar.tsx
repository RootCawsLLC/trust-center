"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export type SelectFilter = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
};

export function FilterBar({
  searchPlaceholder = "Search…",
  selects = [],
  showDateRange = false,
  rightSlot,
}: {
  searchPlaceholder?: string;
  selects?: SelectFilter[];
  showDateRange?: boolean;
  rightSlot?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");

  // Push a param change to the URL (server components re-query on navigation).
  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  // Debounce the free-text search.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => setParam("q", q.trim()), 300);
    return () => clearTimeout(t);
  }, [q, params, setParam]);

  const activeCount =
    (params.get("q") ? 1 : 0) +
    selects.filter((s) => params.get(s.key)).length +
    (params.get("from") || params.get("to") ? 1 : 0);

  function clearAll() {
    setQ("");
    router.replace(pathname, { scroll: false });
  }

  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="relative min-w-56 flex-1">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          className="input pl-9"
          placeholder={searchPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {selects.map((s) => (
        <div key={s.key}>
          <label className="mb-1 block text-xs font-medium text-ink-faint">
            {s.label}
          </label>
          <select
            className="input min-w-36"
            value={params.get(s.key) ?? ""}
            onChange={(e) => setParam(s.key, e.target.value)}
          >
            <option value="">All</option>
            {s.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {showDateRange && (
        <>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-faint">
              From
            </label>
            <input
              type="date"
              className="input"
              value={params.get("from") ?? ""}
              onChange={(e) => setParam("from", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-faint">
              To
            </label>
            <input
              type="date"
              className="input"
              value={params.get("to") ?? ""}
              onChange={(e) => setParam("to", e.target.value)}
            />
          </div>
        </>
      )}

      {activeCount > 0 && (
        <button onClick={clearAll} className="btn-ghost text-sm">
          <X size={14} /> Clear
        </button>
      )}

      {rightSlot && <div className="ml-auto">{rightSlot}</div>}
    </div>
  );
}
