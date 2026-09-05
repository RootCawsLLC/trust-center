"use client";

import { useState, type ReactNode, type ComponentType } from "react";
import { FileText, Network, BookOpen, Megaphone, Search, ExternalLink, ChevronDown, Gauge, SplitSquareHorizontal, CalendarDays } from "lucide-react";
import { DocumentLibrary, type LibraryDoc } from "./DocumentLibrary";
import { cn } from "@/lib/utils";

export type RiskItem = { id: string; category: string; label: string; value: string };
export type RaciRow = { id: string; area: string; corporate: string; product: string; customer: string; note: string | null };
export type CalendarEvent = { id: string; title: string; detail: string | null; framework: string | null; product: string | null; window: string; status: string };

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
  { key: "risk", label: "Risk profile", icon: Gauge },
  { key: "responsibility", label: "Shared responsibility", icon: SplitSquareHorizontal },
  { key: "calendar", label: "Compliance calendar", icon: CalendarDays },
  { key: "subprocessors", label: "Subprocessors", icon: Network },
  { key: "knowledge", label: "FAQ", icon: BookOpen },
  { key: "updates", label: "Updates", icon: Megaphone },
] as const;

export function TrustTabs({
  docs,
  subprocessors,
  articles,
  updates,
  riskItems = [],
  raciItems = [],
  events = [],
  showSubprocessors = true,
  showKnowledge = true,
  showUpdates = true,
}: {
  docs: LibraryDoc[];
  subprocessors: SubprocessorItem[];
  articles: ArticleItem[];
  updates: UpdateItem[];
  riskItems?: RiskItem[];
  raciItems?: RaciRow[];
  events?: CalendarEvent[];
  showSubprocessors?: boolean;
  showKnowledge?: boolean;
  showUpdates?: boolean;
}) {
  const visible: Record<string, boolean> = {
    documents: true,
    risk: riskItems.length > 0,
    responsibility: raciItems.length > 0,
    calendar: events.length > 0,
    subprocessors: showSubprocessors,
    knowledge: showKnowledge,
    updates: showUpdates,
  };
  const tabs = TABS.filter((t) => visible[t.key]);
  // Object-card layout (Reco/SafeBase style): each subject is a card that
  // expands in place to "View more". Documents are the primary section and get
  // their own full-width block below the grid.
  const [open, setOpen] = useState<Set<string>>(new Set());
  function toggle(key: string) {
    setOpen((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }

  const SECTION_META: Record<string, { desc: string; count: number; render: () => ReactNode }> = {
    risk: { desc: "RTO, RPO, encryption, and other key security facts.", count: riskItems.length, render: () => <RiskProfile items={riskItems} /> },
    responsibility: { desc: "Who owns each control — corporate, product, and you.", count: raciItems.length, render: () => <SharedResponsibility items={raciItems} /> },
    calendar: { desc: "Planned audit windows and expected releases.", count: events.length, render: () => <Calendar items={events} /> },
    subprocessors: { desc: "Third parties in our supply chain and their trust pages.", count: subprocessors.length, render: () => <Subprocessors items={subprocessors} /> },
    knowledge: { desc: "Answers to common security-review questions.", count: articles.length, render: () => <Knowledge items={articles} /> },
    updates: { desc: "Recent security, compliance, and product changes.", count: updates.length, render: () => <Updates items={updates} /> },
  };
  const gridSections = tabs.filter((t) => t.key !== "documents");

  return (
    <div className="space-y-10">
      {gridSections.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gridSections.map((t) => {
            const meta = SECTION_META[t.key];
            return (
              <SectionCard
                key={t.key}
                icon={t.icon}
                label={t.label}
                desc={meta.desc}
                count={meta.count}
                open={open.has(t.key)}
                onToggle={() => toggle(t.key)}
              >
                {meta.render()}
              </SectionCard>
            );
          })}
        </div>
      )}

      {/* Documents — the primary resource, always expanded and full width. */}
      <section>
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <FileText size={18} />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink">Document library</h2>
            <p className="text-sm text-ink-faint">{docs.length} document{docs.length === 1 ? "" : "s"} · downloads require a short form; confidential documents also require an NDA.</p>
          </div>
        </div>
        <DocumentLibrary docs={docs} />
      </section>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  label,
  desc,
  count,
  open,
  onToggle,
  children,
}: {
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  desc: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className={cn("card p-5 transition", open && "sm:col-span-2 lg:col-span-3")}>
      <button onClick={onToggle} className="flex w-full items-start justify-between gap-3 text-left">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Icon size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-ink">{label}</h3>
              <span className="rounded-full bg-slate-100 px-1.5 text-xs text-ink-faint">{count}</span>
            </div>
            <p className="mt-0.5 text-sm text-ink-faint">{desc}</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-700">
          {open ? "Show less" : "View more"}
          <ChevronDown size={15} className={cn("transition", open && "rotate-180")} />
        </span>
      </button>
      {open && <div className="mt-4 border-t border-slate-100 pt-4">{children}</div>}
    </div>
  );
}

function Subprocessors({ items }: { items: SubprocessorItem[] }) {
  const [q, setQ] = useState("");
  if (items.length === 0) return <Empty>No subprocessors listed yet.</Empty>;
  const filtered = items.filter((s) =>
    `${s.name} ${s.purpose} ${s.location}`.toLowerCase().includes(q.trim().toLowerCase()),
  );
  return (
    <div>
      <div className="mb-4 rounded-lg bg-brand-50 p-3.5 text-sm text-ink-soft ring-1 ring-inset ring-brand-200">
        Due to restrictions from our subprocessors, we can&apos;t share their security
        documentation directly. Visit each provider&apos;s trust center (linked below)
        to review or download their information.
      </div>
      <div className="relative mb-4 max-w-md">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input className="input pl-9" placeholder="Search subprocessors…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
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
            {filtered.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 font-medium text-ink">
                  {s.website ? (
                    <a href={s.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline" title="Visit their trust center">
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
        {filtered.length === 0 && <div className="p-6 text-center text-sm text-ink-faint">No subprocessors match your search.</div>}
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
          placeholder="Search the FAQ…"
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

function RiskProfile({ items }: { items: RiskItem[] }) {
  if (!items.length) return <Empty>No risk profile published yet.</Empty>;
  const cats = [...new Set(items.map((i) => i.category))];
  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-soft">
        Common answers to security-review questions. See the FAQ and
        shared-responsibility matrix for more detail.
      </p>
      {cats.map((cat) => (
        <section key={cat}>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">{cat}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items
              .filter((i) => i.category === cat)
              .map((i) => (
                <div key={i.id} className="card p-4">
                  <div className="text-sm text-ink-faint">{i.label}</div>
                  <div className="mt-1 text-lg font-semibold text-ink">{i.value}</div>
                </div>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function RaciChip({ v }: { v: string }) {
  if (!v) return <span className="text-ink-faint">—</span>;
  const tone =
    /^R/i.test(v) ? "bg-brand-50 text-brand-700 ring-brand-200"
    : /^A/i.test(v) ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
    : /^C/i.test(v) ? "bg-amber-50 text-amber-700 ring-amber-200"
    : /^I/i.test(v) ? "bg-slate-100 text-slate-700 ring-slate-200"
    : "";
  return tone ? (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", tone)}>{v}</span>
  ) : (
    <span className="text-ink-soft">{v}</span>
  );
}

function SharedResponsibility({ items }: { items: RaciRow[] }) {
  if (!items.length) return <Empty>No shared-responsibility matrix yet.</Empty>;
  return (
    <div>
      <p className="mb-4 text-sm text-ink-soft">
        Who owns each control area across our corporate program, the product, and you
        as the customer. (R = Responsible, A = Accountable, C = Consulted, I = Informed.)
      </p>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-ink-faint">
            <tr>
              <th className="px-4 py-2.5 font-medium">Control area</th>
              <th className="px-4 py-2.5 font-medium">Corporate</th>
              <th className="px-4 py-2.5 font-medium">Product</th>
              <th className="px-4 py-2.5 font-medium">Customer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{r.area}</div>
                  {r.note && <div className="text-xs text-ink-faint">{r.note}</div>}
                </td>
                <td className="px-4 py-3"><RaciChip v={r.corporate} /></td>
                <td className="px-4 py-3"><RaciChip v={r.product} /></td>
                <td className="px-4 py-3"><RaciChip v={r.customer} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Calendar({ items }: { items: CalendarEvent[] }) {
  if (!items.length) return <Empty>No compliance calendar yet.</Empty>;
  const tone: Record<string, string> = {
    planned: "bg-slate-100 text-slate-700 ring-slate-200",
    "in-progress": "bg-amber-50 text-amber-700 ring-amber-200",
    complete: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  };
  return (
    <div className="space-y-3">
      {items.map((e) => (
        <div key={e.id} className="card flex items-start gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <CalendarDays size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-ink">{e.title}</h3>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset", tone[e.status] ?? tone.planned)}>
                {e.status.replace("-", " ")}
              </span>
            </div>
            {e.detail && <p className="mt-0.5 text-sm text-ink-soft">{e.detail}</p>}
            {(e.framework || e.product) && (
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-ink-faint">
                {e.framework && <span className="rounded bg-slate-100 px-1.5 py-0.5">{e.framework}</span>}
                {e.product && <span className="rounded bg-slate-100 px-1.5 py-0.5">{e.product}</span>}
              </div>
            )}
          </div>
          <div className="shrink-0 text-right text-sm font-medium text-ink">{e.window}</div>
        </div>
      ))}
    </div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="card p-10 text-center text-sm text-ink-faint">{children}</div>
  );
}
