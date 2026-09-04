import Link from "next/link";
import { ShieldCheck, Lock, FileCheck, Server, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { DocumentLibrary, type LibraryDoc } from "@/components/download/DocumentLibrary";

export const dynamic = "force-dynamic";

const COMPANY = process.env.COMPANY_NAME ?? "Acme Corp";

export default async function HomePage() {
  const docs = await prisma.document.findMany({
    where: { isPublished: true },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });

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
  }));

  const publicCount = docs.filter((d) => d.visibility === "PUBLIC").length;
  const privateCount = docs.length - publicCount;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
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

      {/* Hero */}
      <section className="bg-grid border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-200">
              <ShieldCheck size={13} /> Security &amp; Compliance
            </span>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
              Trust, documented.
            </h1>
            <p className="mt-4 text-lg text-ink-soft">
              Review {COMPANY}&apos;s security posture, compliance certifications,
              audit reports, and policies. Public documents are available
              instantly; confidential materials are shared under NDA.
            </p>
            <div className="mt-8 flex flex-wrap gap-6 text-sm">
              <Stat value={docs.length} label="Documents" />
              <Stat value={publicCount} label="Public" />
              <Stat value={privateCount} label="Under NDA" />
            </div>
          </div>
        </div>
      </section>

      {/* Highlights */}
      <section className="border-b border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <Highlight icon={<FileCheck size={20} />} title="Audited" desc="Independent SOC 2 & ISO 27001 examinations." />
          <Highlight icon={<Lock size={20} />} title="Encrypted" desc="Data encrypted in transit and at rest." />
          <Highlight icon={<Server size={20} />} title="Resilient" desc="Tested continuity and incident response." />
          <Highlight icon={<ShieldCheck size={20} />} title="Governed" desc="Policies reviewed and enforced." />
        </div>
      </section>

      {/* Library */}
      <main className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-ink">
            Document library
          </h2>
          <p className="mt-1 text-ink-soft">
            All downloads require a few details. Confidential documents also
            require accepting an NDA.
          </p>
        </div>
        {libraryDocs.length > 0 ? (
          <DocumentLibrary docs={libraryDocs} />
        ) : (
          <p className="text-ink-faint">No documents published yet.</p>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-ink-faint sm:flex-row">
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

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="text-2xl font-bold text-ink">{value}</div>
      <div className="text-ink-faint">{label}</div>
    </div>
  );
}

function Highlight({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-sm text-ink-soft">{desc}</p>
    </div>
  );
}
