import Link from "next/link";
import { ShieldCheck, ArrowRight, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CertBadge } from "@/components/marketing/CertBadge";
import { type LibraryDoc } from "@/components/download/DocumentLibrary";
import { TrustTabs } from "@/components/download/TrustTabs";
import { AskWidget } from "@/components/marketing/AskWidget";
import { getOrgSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function uniqueSorted(v: string[]) {
  return [...new Set(v)].sort((a, b) => a.localeCompare(b));
}

export default async function HomePage() {
  const [settings, docs, certifications, subprocessors, articles, updates, riskItems, raciItems, events] = await Promise.all([
    getOrgSettings(),
    prisma.document.findMany({
      where: { isPublished: true },
      orderBy: [{ category: "asc" }, { title: "asc" }],
    }),
    prisma.certification.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { displayName: "asc" }],
    }),
    prisma.subprocessor.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.knowledgeArticle.findMany({ where: { isPublished: true }, orderBy: { sortOrder: "asc" } }),
    prisma.trustUpdate.findMany({ where: { isPublished: true }, orderBy: { publishedAt: "desc" } }),
    prisma.riskProfileItem.findMany({ where: { isPublished: true }, orderBy: { sortOrder: "asc" } }),
    prisma.raciItem.findMany({ where: { isPublished: true }, orderBy: { sortOrder: "asc" } }),
    prisma.complianceEvent.findMany({ where: { isPublished: true }, orderBy: { sortOrder: "asc" } }),
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

  // Badges are driven by the admin-managed Certification records first (they
  // carry status + a real detail-page slug). Any framework that only appears on
  // published documents — with no Certification record yet — is appended so
  // nothing silently disappears from the public wall.
  type Badge = { key: string; name: string; framework: string; slug?: string; status?: string };
  const certBadges: Badge[] = certifications.map((c) => ({
    key: c.id,
    name: c.displayName,
    framework: c.framework,
    slug: c.slug,
    status: c.status,
  }));
  const coveredFrameworks = new Set(certifications.map((c) => c.framework));
  const docFrameworks = uniqueSorted(
    docs
      .filter((d) => d.category === "CERTIFICATION" || d.category === "AUDIT")
      .flatMap((d) => d.frameworks),
  ).filter((f) => !coveredFrameworks.has(f));
  const badges: Badge[] = [
    ...certBadges,
    ...docFrameworks.map((f) => ({ key: f, name: f, framework: f })),
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ShieldCheck size={18} />
            </div>
            <span className="font-semibold text-ink">{settings.companyName} Trust Center</span>
          </div>
          <div className="flex items-center gap-4">
            {settings.statusPageUrl && (
              <a
                href={settings.statusPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-brand-700"
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> System status
              </a>
            )}
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-ink-soft transition hover:border-brand-300 hover:text-brand-700"
            >
              <Lock size={13} /> Vendor admin
            </Link>
          </div>
        </div>
      </header>

      {/* Overview */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
            <ShieldCheck size={13} /> Trust Center
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            {settings.tagline}
          </h1>
          <p className="mt-3 text-lg text-ink-soft">{settings.overview}</p>

          {badges.length > 0 && (
            <div className="mt-7">
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
                Certifications &amp; attestations{" "}
                <span className="font-normal normal-case text-ink-faint/80">
                  (click a badge below to learn more)
                </span>
              </div>
              <div className="flex flex-wrap gap-4">
                {badges.map((b) => (
                  <CertBadge key={b.key} name={b.name} framework={b.framework} slug={b.slug} status={b.status} />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Resources */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-4">
          <h2 className="text-xl font-bold tracking-tight text-ink">Resources</h2>
          <p className="text-sm text-ink-soft">
            Documents, subprocessors, knowledge base, and product updates. All
            downloads require a few details; confidential documents also require an
            NDA.
          </p>
        </div>
        <TrustTabs
          showSubprocessors={settings.showSubprocessors}
          showKnowledge={settings.showKnowledge}
          showUpdates={settings.showUpdates}
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
            contentHtml: a.contentHtml,
            bodyMarkdown: a.bodyMarkdown,
            url: a.url,
            fileName: a.fileName,
          }))}
          updates={updates.map((u) => ({
            id: u.id,
            title: u.title,
            contentHtml: u.contentHtml,
            bodyMarkdown: u.bodyMarkdown,
            type: u.type,
            publishedAt: u.publishedAt.toISOString(),
          }))}
          riskItems={riskItems.map((r) => ({ id: r.id, category: r.category, label: r.label, value: r.value }))}
          raciItems={raciItems.map((r) => ({ id: r.id, area: r.area, corporate: r.corporate, product: r.product, customer: r.customer, note: r.note }))}
          events={events.map((e) => ({ id: e.id, title: e.title, detail: e.detail, framework: e.framework, product: e.product, window: e.window, status: e.status }))}
        />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-ink-faint sm:flex-row">
          <span>
            © {new Date().getFullYear()} {settings.companyName}. All rights reserved.
          </span>
          <Link href="/admin" className="inline-flex items-center gap-1 hover:text-ink">
            Vendor admin <ArrowRight size={13} />
          </Link>
        </div>
      </footer>

      <AskWidget company={settings.companyName} />
    </div>
  );
}
