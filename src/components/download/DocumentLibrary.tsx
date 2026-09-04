"use client";

import { useState } from "react";
import { Lock, Globe, Download, FileText } from "lucide-react";
import { DownloadModal, type PublicDoc } from "./DownloadModal";
import { CATEGORY_LABELS, CATEGORY_ORDER, CATEGORY_SINGULAR } from "@/lib/constants";
import { bytesToSize } from "@/lib/utils";
import type { DocumentCategory } from "@prisma/client";

export type LibraryDoc = PublicDoc & {
  sizeBytes: number;
  version: string;
  updatedAt: string;
};

export function DocumentLibrary({ docs }: { docs: LibraryDoc[] }) {
  const [selected, setSelected] = useState<LibraryDoc | null>(null);

  const groups = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: docs.filter((d) => d.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-12">
      {groups.map(({ cat, items }) => (
        <section key={cat} id={cat.toLowerCase()}>
          <h2 className="mb-4 text-lg font-semibold text-ink">
            {CATEGORY_LABELS[cat as DocumentCategory]}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((doc) => (
              <article
                key={doc.id}
                className="card flex flex-col p-5 transition hover:shadow-lift"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-ink-soft">
                    <FileText size={18} />
                  </div>
                  <VisibilityBadge visibility={doc.visibility} />
                </div>
                <h3 className="font-semibold text-ink">{doc.title}</h3>
                {doc.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                    {doc.description}
                  </p>
                )}
                <div className="mt-3 flex items-center gap-2 text-xs text-ink-faint">
                  <span>{CATEGORY_SINGULAR[doc.category as DocumentCategory]}</span>
                  <span>·</span>
                  <span>v{doc.version}</span>
                  {doc.sizeBytes > 0 && (
                    <>
                      <span>·</span>
                      <span>{bytesToSize(doc.sizeBytes)}</span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setSelected(doc)}
                  className="btn-primary mt-4 w-full"
                >
                  <Download size={16} />
                  {doc.visibility === "PRIVATE" ? "Request access" : "Download"}
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}

      <DownloadModal doc={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function VisibilityBadge({ visibility }: { visibility: "PUBLIC" | "PRIVATE" }) {
  if (visibility === "PRIVATE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
        <Lock size={12} /> NDA required
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
      <Globe size={12} /> Public
    </span>
  );
}
