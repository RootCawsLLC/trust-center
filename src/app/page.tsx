import Link from "next/link";
import { ShieldCheck, BadgeCheck, ArrowRight, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { type LibraryDoc } from "@/components/download/DocumentLibrary";
import { TrustTabs } from "@/components/download/TrustTabs";

export const dynamic = "force-dynamic";

const COMPANY = process.env.COMPANY_NAME ?? "Acme Corp";
const TAGLINE = "Security, privacy, and compliance — transparent by default.";
const OVERVIEW = `${COMPANY} builds enterprise software with security and privacy at its core. This Trust Center is where customers and prospects review our certifications, audit reports, policies, and legal documents. Public materials are available instantly; confidential materials are shared under NDA.`;

function uniqueSorted(v: string[]) {
  return [...new Set(v)].sort((a, b) => a.localeCompare(b));
}

export default async function HomePage() {
  const [docs, subprocessors, articles, updates] = await Promise.all([
    prisma.document.findMany({
      where: { isPublished: true },
      orderBy: [{ category: "asc" }, { title: "asc" }],
    }),
    prisma.subprocessor.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.knowledgeArticle.findMany({
      where: { isPublished: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.trustUpdate.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: "desc" },
    }),
  ]);

  const libraryDocs: LibraryDoc[] = docs.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    category: d.category,
    visibility: d.visibility,
    fileName: d.fileName,
    sizeBytes: d.sizeBytes,
    version: d.version,
    updatedAt: d.updatedAt.toISOString(),
    industries: d.industries,
    regions: d.regions,
    frameworks: d.frameworks,
  }));

  const publicCount = docs.filter((d) => d.visibility === "PUBLIC").length;
  const badges = uniqueSorted(
    docs
      .filter((d) => d.category === "CERTIFICATION" || d.category === "AUDIT")
      .flatMap((d) => d.frameworks),
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ShieldCheck size={18} />
            </div>
            <span className="font-semibold text-ink">{COMPANY} Trust Center</span>
          </div>
          <Link href="/admin" className="btn-ghost text-sm">
            Admin
          </Link>
        </div>
      </header>

      {/* Overview */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
            <ShieldCheck size={13} /> Trust Center
          </span>
          <h1 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {TAGLINE}
          </h1>
          <p className="mt-3 max-w-2xl text-ink-soft">{OVERVIEW}</p>

          {badges.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
                Certifications &amp; attestations
              </div>
              <div className="flex flex-wrap gap-2">
                {badges.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-ink"
                  >
                    <BadgeCheck size={15} className="text-brand-600" />
                    {b}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-8 text-sm">
            <Stat value={docs.length} label="Documents" />
            <Stat value={publicCount} label="Public" />
            <Stat value={docs.length - publicCount} label="Under NDA" icon />
          </div>
        </div>
      </section>

      {/* Document center */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-4">
          <h2 className="text-xl font-bold tracking-tight text-ink">Resources</h2>
          <p className="text-sm text-ink-soft">
            Documents, subprocessors, knowledge base, and product updates. All
            downloads require a few details; confidential documents also require an
            NDA.
          </p>
        </div>
        <TrustTabs
          docs={libraryDocs}
          subprocessors={subprocessors.map((s) => ({
            id: s.id,
            name: s.name,
            purpose: s.purpose,
            location: s.location,
            website: s.website,
          }))}
          articles={articles.map((a) => ({
            id: a.id,
            title: a.title,
            category: a.category,
            bodyMarkdown: a.bodyMarkdown,
          }))}
          updates={updates.map((u) => ({
            id: u.id,
            title: u.title,
            bodyMarkdown: u.bodyMarkdown,
            type: u.type,
            publishedAt: u.publishedAt.toISOString(),
          }))}
        />
        {libraryDocs.length === 0 && (
          <p className="mt-2 text-ink-faint">No documents published yet.</p>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-ink-faint sm:flex-row">
          <span>
            © {new Date().getFullYear()} {COMPANY}. All rights reserved.
          </span>
          <Link href="/admin" className="inline-flex items-center gap-1 hover:text-ink">
            Vendor admin <ArrowRight size={13} />
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label, icon }: { value: number; label: string; icon?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-2xl font-bold text-ink">
        {icon && <Lock size={16} className="text-amber-500" />}
        {value}
      </div>
      <div className="text-ink-faint">{label}</div>
    </div>
  );
}
