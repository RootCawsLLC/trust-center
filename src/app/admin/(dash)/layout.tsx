import { requireSession } from "@/lib/session";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white md:block">
        <div className="sticky top-0 h-screen">
          <AdminNav
            role={session.user.role}
            email={session.user.email}
            name={session.user.name}
          />
        </div>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
