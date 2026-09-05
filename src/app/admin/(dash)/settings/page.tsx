import { prisma } from "@/lib/prisma";
import { requireModuleView } from "@/lib/permissions";
import { ssoEnabled, env } from "@/lib/env";
import { PageHeader, Pill } from "@/components/admin/ui";
import { CheckCircle2, Circle, ShieldCheck } from "lucide-react";
import { getOrgSettings } from "@/lib/settings";
import { SettingsForm } from "./SettingsForm";

export const dynamic = "force-dynamic";

async function ledgerImmutable(): Promise<boolean> {
  // Count immutability triggers on the ledger tables (3 expected).
  // Tagged-template raw query (parameterized; no interpolation) — never the
  // $queryRawUnsafe variant, which does no escaping.
  const rows = await prisma.$queryRaw<{ n: bigint }[]>`
    SELECT count(*)::bigint AS n FROM pg_trigger
    WHERE tgname = 'trust_immutable_guard' AND NOT tgisinternal`;
  return Number(rows[0]?.n ?? 0) >= 3;
}

export default async function SettingsPage() {
  await requireModuleView("settings");
  const immutable = await ledgerImmutable().catch(() => false);
  const settings = await getOrgSettings();

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Branding, public sections, requests, authentication, and security."
      />

      <div className="mb-6">
        <SettingsForm settings={settings} />
      </div>

      <div className="space-y-6">
        <section className="card p-6">
          <h2 className="text-base font-semibold text-ink">Single sign-on</h2>
          <p className="mt-1 text-sm text-ink-soft">
            SSO providers light up automatically when their environment variables
            are configured. Email &amp; password sign-in is always available for
            provisioned users.
          </p>
          <div className="mt-4 space-y-2">
            <ProviderRow name="Okta (OIDC)" enabled={ssoEnabled.okta} />
            <ProviderRow name="Google Workspace" enabled={ssoEnabled.google} />
          </div>
          {(!ssoEnabled.okta || !ssoEnabled.google) && (
            <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-ink-faint ring-1 ring-inset ring-slate-200">
              To enable a provider, set its variables (e.g.{" "}
              <code>OKTA_ISSUER</code>, <code>OKTA_CLIENT_ID</code>,{" "}
              <code>OKTA_CLIENT_SECRET</code> or <code>GOOGLE_CLIENT_ID</code>,{" "}
              <code>GOOGLE_CLIENT_SECRET</code>) and add the callback URL
              <code> {env.APP_URL}/api/auth/callback/&lt;provider&gt;</code>.
              Then provision each user here with a matching email.
            </p>
          )}
        </section>

        <section className="card p-6">
          <h2 className="text-base font-semibold text-ink">Data &amp; security</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ConfigRow label="Immutable ledger" ok={immutable}>
              {immutable ? "Enforced (triggers active)" : "Not detected"}
            </ConfigRow>
            <ConfigRow label="Document storage" ok>
              {env.STORAGE_DRIVER === "s3" ? "Amazon S3 (private)" : "Local disk (dev)"}
            </ConfigRow>
            <ConfigRow label="Region" ok>
              {env.AWS_REGION}
            </ConfigRow>
            <ConfigRow label="Public app URL" ok>
              {env.APP_URL}
            </ConfigRow>
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-emerald-600" size={20} />
            <div>
              <h2 className="text-base font-semibold text-ink">
                Immutable request &amp; consent ledger
              </h2>
              <p className="mt-1 text-sm text-ink-soft">
                Download requests, NDA acceptances, and audit entries are written
                to append-only tables. Database triggers reject any UPDATE or
                DELETE from every role — including the application&apos;s. A
                dedicated least-privilege role (with no update/delete grants on
                these tables) is also provisioned for the app to use in
                production. History can be added to, never rewritten.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ProviderRow({ name, enabled }: { name: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5">
      <span className="text-sm text-ink">{name}</span>
      {enabled ? (
        <Pill tone="emerald">Enabled</Pill>
      ) : (
        <Pill tone="slate">Scaffolded</Pill>
      )}
    </div>
  );
}

function ConfigRow({
  label,
  ok,
  children,
}: {
  label: string;
  ok: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-slate-200 px-4 py-3">
      {ok ? (
        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
      ) : (
        <Circle size={16} className="mt-0.5 shrink-0 text-slate-400" />
      )}
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-ink-faint">
          {label}
        </div>
        <div className="text-sm text-ink">{children}</div>
      </div>
    </div>
  );
}
