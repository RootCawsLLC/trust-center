import { prisma } from "@/lib/prisma";
import { requireModuleView } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { IntegrationCard } from "./IntegrationCard";
import { Info } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  await requireModuleView("integrations");
  const integrations = await prisma.integration.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });

  return (
    <div>
      <PageHeader
        title="Integrations"
        description="Connect the systems this trust center works with."
      />
      <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-brand-50 p-3.5 text-sm text-ink-soft ring-1 ring-inset ring-brand-200">
        <Info size={16} className="mt-0.5 shrink-0 text-brand-600" />
        <span>
          These are <strong>scaffolded placeholders</strong> for a fork/UAT. Connecting
          flips the status and is audit-logged, but the live wiring (OAuth, API keys,
          SOQL, SES) is enabled per the README when you deploy your own instance.
        </span>
      </div>

      {integrations.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-faint">No integrations configured.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {integrations.map((i) => (
            <IntegrationCard
              key={i.key}
              item={{ key: i.key, name: i.name, category: i.category, status: i.status, note: i.note }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
