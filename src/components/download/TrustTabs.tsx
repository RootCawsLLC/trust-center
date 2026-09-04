"use client";

import { useState } from "react";
import { FileText, Network, BookOpen, Megaphone, Search, ExternalLink, ChevronDown } from "lucide-react";
import { DocumentLibrary, type LibraryDoc } from "./DocumentLibrary";
import { cn } from "@/lib/utils";

export type SubprocessorItem = {
  id: string;
  name: string;
  purpose: string;
  location: string;
  website: string | null;
};
export type ArticleItem = {
  id: string;
  title: string;
  category: string;
  contentHtml: string | null;
  bodyMarkdown: string;
  url: string | null;
  fileName: string | null;
};
export type UpdateItem = {
  id: string;
  title: string;
  contentHtml: string | null;
  bodyMarkdown: string;
  type: string;
  publishedAt: string;
};

const TABS = [
  { key: "documents", label: "Documents", icon: FileText },
  { key: "subprocessors", label: "Subprocessors", icon: Network },
  { key: "knowledge", label: "Knowledge base", icon: BookOpen },
  { key: "updates", label: "Updates", icon: Megaphone },
] as const;

export function TrustTabs({
  docs,
  subprocessors,
  articles,
  updates,
  showSubprocessors = true,
  showKnowledge = true,
  showUpdates = true,
}: {
  docs: LibraryDoc[];
  subprocessors: SubprocessorItem[];
  articles: ArticleItem[];
  updates: UpdateItem[];
  showSubprocessors?: boolean;
  showKnowledge?: boolean;
  showUpdates?: boolean;
}) {
  const visible: Record<string, boolean> = {
    documents: true,
    subprocessors: showSubprocessors,
    knowledge: showKnowledge,
    updates: showUpdates,
  };
  const tabs = TABS.filter((t) => visible[t.key]);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("documents");

  const counts: Record<string, number> = {
    documents: docs.length,
    subprocessors: subprocessors.length,
    knowledge: articles.length,
    updates: updates.length,
  };

  return (
    <div>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition",
                active
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-ink-faint hover:text-ink",
              )}
            >
              <Icon size={15} />
              {t.label}
              <span className="rounded-full bg-slate-100 px-1.5 text-xs text-ink-faint">
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "documents" && <DocumentLibrary docs={docs} />}
      {tab === "subprocessors" && <Subprocessors items={subprocessors} />}
      {tab === "knowledge" && <Knowledge items={articles} />}
      {tab === "updates" && <Updates items={updates} />}
    </div>
  );
}

function Subprocessors({ items }: { items: SubprocessorItem[] }) {
  if (items.length === 0)
    return <Empty>No subprocessors listed yet.</Empty>;
  return (
    <div>
      <p className="mb-4 text-sm text-ink-soft">
        The third-party service providers we use to deliver our service, and what
        each is used for.
      </p>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-2.5 font-medium">Subprocessor</th>
              <th className="px-4 py-2.5 font-medium">Purpose</th>
              <th className="px-4 py-2.5 font-medium">Location</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium text-ink">
                  {s.website ? (
                    <a href={s.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                      {s.name} <ExternalLink size={12} />
                    </a>
                  ) : (
                    s.name
                  )}
                </td>
                <td className="px-4 py-3 text-ink-soft">{s.purpose}</td>
                <td className="px-4 py-3 text-ink-soft">{s.location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Knowledge({ items }: { items: ArticleItem[] }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const filtered = items.filter((a) =>
    `${a.title} ${a.category}`.toLowerCase().includes(q.trim().toLowerCase()),
  );
  if (items.length === 0) return <Empty>No articles yet.</Empty>;
  return (
    <div>
      <div className="relative mb-4 max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-9"
          placeholder="Search the knowledge base…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        {filtered.map((a) => (
          <div key={a.id} className="card overflow-hidden">
            <button
              onClick={() => setOpen(open === a.id ? null : a.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span>
                <span className="font-medium text-ink">{a.title}</span>
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-ink-faint">
                  {a.category}
                </span>
              </span>
              <ChevronDown
                size={16}
                className={cn("shrink-0 text-ink-faint transition", open === a.id && "rotate-180")}
              />
            </button>
            {open === a.id && (
              <div className="border-t border-slate-100 px-4 py-3 text-sm leading-relaxed text-ink-soft">
                {a.contentHtml ? (
                  <div className="tc-prose" dangerouslySetInnerHTML={{ __html: a.contentHtml }} />
                ) : a.bodyMarkdown ? (
                  <p className="whitespace-pre-wrap">{a.bodyMarkdown}</p>
                ) : null}
                {a.url && (
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline">
                    Open resource ↗
                  </a>
                )}
                {a.fileName && (
                  <a href={`/api/kb-file/${a.id}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline">
                    Download {a.fileName}
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <Empty>No articles match your search.</Empty>}
      </div>
    </div>
  );
}

const UPDATE_TONE: Record<string, string> = {
  compliance: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  new: "bg-brand-50 text-brand-700 ring-brand-200",
  security: "bg-amber-50 text-amber-700 ring-amber-200",
  update: "bg-slate-100 text-slate-700 ring-slate-200",
};

function Updates({ items }: { items: UpdateItem[] }) {
  if (items.length === 0) return <Empty>No updates yet.</Empty>;
  return (
    <div className="space-y-4">
      {items.map((u) => (
        <div key={u.id} className="card p-5">
          <div className="mb-1 flex items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset", UPDATE_TONE[u.type] ?? UPDATE_TONE.update)}>
              {u.type}
            </span>
            <span className="text-xs text-ink-faint">
              {new Date(u.publishedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
          <h3 className="font-semibold text-ink">{u.title}</h3>
          {u.contentHtml ? (
            <div className="tc-prose mt-1 text-sm text-ink-soft" dangerouslySetInnerHTML={{ __html: u.contentHtml }} />
          ) : (
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{u.bodyMarkdown}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="card p-10 text-center text-sm text-ink-faint">{children}</div>
  );
}
