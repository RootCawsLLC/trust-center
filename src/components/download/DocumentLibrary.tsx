"use client";

import { useMemo, useState } from "react";
import { Lock, Globe, Download, FileText, Search, X, SlidersHorizontal, Package, DownloadCloud } from "lucide-react";
import { DownloadModal, type PublicDoc } from "./DownloadModal";
import { BulkDownloadModal } from "./BulkDownloadModal";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { DocumentCategory } from "@prisma/client";

export type LibraryDoc = PublicDoc & {
  sizeBytes: number;
  version: string;
  updatedAt: string;
  industries: string[];
  regions: string[];
  frameworks: string[];
};

function uniqueSorted(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function DocumentLibrary({ docs }: { docs: LibraryDoc[] }) {
  const [selected, setSelected] = useState<LibraryDoc | null>(null);
  const [bulk, setBulk] = useState<{ docs: LibraryDoc[]; label: string } | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState("");
  const [framework, setFramework] = useState("");

  const facets = useMemo(
    () => ({
      industries: uniqueSorted(docs.flatMap((d) => d.industries)),
      regions: uniqueSorted(docs.flatMap((d) => d.regions)),
      frameworks: uniqueSorted(docs.flatMap((d) => d.frameworks)),
    }),
    [docs],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) => {
      if (q && !`${d.title} ${d.description ?? ""} ${d.frameworks.join(" ")}`.toLowerCase().includes(q)) return false;
      if (category && d.category !== category) return false;
      if (industry && !d.industries.includes(industry)) return false;
      if (region && !d.regions.includes(region)) return false;
      if (framework && !d.frameworks.includes(framework)) return false;
      return true;
    });
  }, [docs, query, category, industry, region, framework]);

  const groups = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: filtered.filter((d) => d.category === cat),
  })).filter((g) => g.items.length > 0);

  const activeFilters = [category, industry, region, framework].filter(Boolean).length + (query ? 1 : 0);
  const publicDocs = docs.filter((d) => d.visibility === "PUBLIC");
  const selectedDocs = docs.filter((d) => checked.has(d.id));
  const anyPrivateSelected = selectedDocs.some((d) => d.visibility === "PRIVATE");

  function clearAll() {
    setQuery("");
    setCategory("");
    setIndustry("");
    setRegion("");
    setFramework("");
  }
  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className={cn(checked.size > 0 && "pb-20")}>
      {/* Bulk actions */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button className="btn-secondary" onClick={() => setBulk({ docs: publicDocs, label: "Download all public documents" })} disabled={publicDocs.length === 0}>
          <DownloadCloud size={16} /> Download all public
        </button>
        <button className="btn-secondary" onClick={() => setBulk({ docs, label: "Download all documents" })}>
          <DownloadCloud size={16} /> Download all
        </button>
        <span className="text-xs text-ink-faint">or select documents below to download together</span>
      </div>

      {/* Search + facets */}
      <div className="sticky top-[57px] z-30 -mx-2 mb-6 rounded-xl border border-slate-200 bg-white/95 p-3 shadow-card backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-52 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search documents…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Facet label="Category" value={category} onChange={setCategory} options={CATEGORY_ORDER.filter((c) => docs.some((d) => d.category === c)).map((c) => ({ value: c, label: CATEGORY_LABELS[c as DocumentCategory] }))} />
          {facets.industries.length > 0 && <Facet label="Industry" value={industry} onChange={setIndustry} options={facets.industries.map((v) => ({ value: v, label: v }))} />}
          {facets.regions.length > 0 && <Facet label="Region" value={region} onChange={setRegion} options={facets.regions.map((v) => ({ value: v, label: v }))} />}
          {facets.frameworks.length > 0 && <Facet label="Framework" value={framework} onChange={setFramework} options={facets.frameworks.map((v) => ({ value: v, label: v }))} />}
          {activeFilters > 0 && (
            <button onClick={clearAll} className="btn-ghost text-sm"><X size={14} /> Clear</button>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5 px-1 text-xs text-ink-faint">
          <SlidersHorizontal size={12} />
          {filtered.length} of {docs.length} documents
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="card p-10 text-center text-sm text-ink-faint">
          No documents match your filters.{" "}
          <button onClick={clearAll} className="text-brand-600 hover:underline">Clear filters</button>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(({ cat, items }) => (
            <section key={cat} id={cat.toLowerCase()}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-ink-faint">
                {CATEGORY_LABELS[cat as DocumentCategory]}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-ink-faint">{items.length}</span>
              </h2>
              <div className="space-y-2">
                {items.map((doc) => (
                  <DocRow key={doc.id} doc={doc} checked={checked.has(doc.id)} onToggle={() => toggle(doc.id)} onOpen={() => setSelected(doc)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Selection bar */}
      {checked.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-6 py-3">
            <div className="text-sm">
              <span className="font-semibold text-ink">{checked.size} selected</span>
              {anyPrivateSelected && <span className="ml-2 font-medium text-amber-700">· NDA required</span>}
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost text-sm" onClick={() => setChecked(new Set())}>Clear</button>
              <button className="btn-primary" onClick={() => setBulk({ docs: selectedDocs, label: "Download selected documents" })}>
                <Package size={16} /> Download {checked.size} selected
              </button>
            </div>
          </div>
        </div>
      )}

      <DownloadModal doc={selected} onClose={() => setSelected(null)} />
      <BulkDownloadModal docs={bulk?.docs ?? null} label={bulk?.label ?? ""} onClose={() => setBulk(null)} />
    </div>
  );
}

function DocRow({ doc, checked, onToggle, onOpen }: { doc: LibraryDoc; checked: boolean; onToggle: () => void; onOpen: () => void }) {
  const isPrivate = doc.visibility === "PRIVATE";
  return (
    <article className={cn("flex items-center gap-3 rounded-xl border bg-white px-4 py-3 transition hover:shadow-card", checked ? "border-brand-300 ring-1 ring-brand-200" : "border-slate-200 hover:border-brand-200")}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
        aria-label={`Select ${doc.title}`}
      />
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-ink-soft">
        <FileText size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium text-ink">{doc.title}</h3>
          {isPrivate ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200"><Lock size={10} /> NDA</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200"><Globe size={10} /> Public</span>
          )}
        </div>
        {doc.description && <p className="truncate text-sm text-ink-faint">{doc.description}</p>}
        {(doc.frameworks.length > 0 || doc.industries.length > 0) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {[...doc.frameworks, ...doc.industries].slice(0, 4).map((t) => (
              <span key={t} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-ink-faint">{t}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <button onClick={onOpen} className={cn(isPrivate ? "btn-secondary" : "btn-primary")}>
          <Download size={15} />
          <span className="hidden sm:inline">{isPrivate ? "Request access" : "Download"}</span>
        </button>
        <span className={cn("text-xs font-semibold", isPrivate ? "text-amber-700" : "text-emerald-700")}>
          {isPrivate ? "NDA required" : "No NDA required"}
        </span>
      </div>
    </article>
  );
}

function Facet({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select className={cn("input w-auto", value && "border-brand-400 bg-brand-50 text-brand-800")} value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
      <option value="">{label}: All</option>
      {options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
  );
}
