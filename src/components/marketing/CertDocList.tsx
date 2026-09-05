"use client";

import { useState } from "react";
import { Lock, Globe, Download } from "lucide-react";
import { DownloadModal, type PublicDoc } from "@/components/download/DownloadModal";
import { cn } from "@/lib/utils";

export function CertDocList({ docs }: { docs: PublicDoc[] }) {
  const [selected, setSelected] = useState<PublicDoc | null>(null);
  if (docs.length === 0) {
    return (
      <p className="text-sm text-ink-faint">
        No documents are scoped to this certification yet.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {docs.map((doc) => {
        const isPrivate = doc.visibility === "PRIVATE";
        return (
          <article
            key={doc.id}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-brand-200 hover:shadow-card"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-ink">{doc.title}</h3>
                {isPrivate ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                    <Lock size={10} /> Private
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    <Globe size={10} /> Public
                  </span>
                )}
              </div>
              {doc.description && (
                <p className="truncate text-sm text-ink-faint">{doc.description}</p>
              )}
            </div>
            <button
              onClick={() => setSelected(doc)}
              className={cn(isPrivate ? "btn-secondary" : "btn-primary", "shrink-0")}
            >
              <Download size={15} />
              <span className="hidden sm:inline">{isPrivate ? "Request access" : "Download"}</span>
            </button>
          </article>
        );
      })}
      <DownloadModal doc={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
