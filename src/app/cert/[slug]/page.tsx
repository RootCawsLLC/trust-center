import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { getOrgSettings } from "@/lib/settings";
import { CertBadge } from "@/components/marketing/CertBadge";
import { CertDocList } from "@/components/marketing/CertDocList";
import type { PublicDoc } from "@/components/download/DownloadModal";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  Certified: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "In progress": "bg-amber-50 text-amber-700 ring-amber-200",
  Planned: "bg-slate-100 text-slate-700 ring-slate-200",
};

export default async function CertPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [settings, cert, allDocs] = await Promise.all([
    getOrgSettings(),
    prisma.certification.findFirst({ where: { slug, isPublished: true } }),
    prisma.document.findMany({
      where: { isPublished: true },
      orderBy: [{ category: "asc" }, { title: "asc" }],
    }),
  ]);

  // Resolve the framework name from the record, or by matching a document tag.
  let framework = cert?.framework;
  if (!framework) {
    const frameworks = [...new Set(allDocs.flatMap((d) => d.frameworks))];
    framework = frameworks.find((f) => slugify(f) === slug);
  }
  if (!framework) notFound();

  const scoped: PublicDoc[] = allDocs
    .filter((d) => d.frameworks.includes(framework as string))
    .map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      category: d.category,
      visibility: d.visibility,
      fileName: d.fileName,
    }));

  const displayName = cert?.displayName ?? framework;
  const status = cert?.status ?? "Certified";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <ShieldCheck size={18} />
            </div>
            <span className="font-semibold text-ink">{settings.companyName} Trust Center</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink"
        >
          <ArrowLeft size={15} /> Back to trust center
        </Link>

        <div className="flex items-start gap-5">
          <CertBadge name={framework} />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-ink">{displayName}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_TONE[status] ?? STATUS_TONE.Certified}`}>
                {status}
              </span>
            </div>
            {cert?.summaryHtml ? (
              <div
                className="tc-prose mt-4 text-ink-soft"
                dangerouslySetInnerHTML={{ __html: cert.summaryHtml }}
              />
            ) : (
              <p className="mt-4 text-ink-soft">
                {settings.companyName} maintains {framework}. The documents scoped to
                this certification are available below.
              </p>
            )}
          </div>
        </div>

        {cert?.productsInScope && cert.productsInScope.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-faint">
              Products in scope
            </h2>
            <div className="flex flex-wrap gap-2">
              {cert.productsInScope.map((p) => (
                <span
                  key={p}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-ink"
                >
                  {p}
                </span>
              ))}
            </div>
          </section>
        )}

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold tracking-tight text-ink">
            Documentation
          </h2>
          <CertDocList docs={scoped} />
        </section>
      </main>
    </div>
  );
}
