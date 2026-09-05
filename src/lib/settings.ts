import { prisma } from "@/lib/prisma";

export type ResolvedSettings = {
  companyName: string;
  tagline: string;
  overview: string;
  supportEmail: string | null;
  statusPageUrl: string | null;
  primaryColor: string | null;
  showSubprocessors: boolean;
  showKnowledge: boolean;
  showUpdates: boolean;
  grantTtlMinutes: number;
  approvalMode: "auto" | "manual";
  watermarkEnabled: boolean;
  customerNdaBypass: boolean;
  retentionNote: string | null;
};

export function defaultOverview(company: string) {
  return `${company} builds enterprise software with security and privacy at its core. This Trust Center is where customers and prospects review our certifications, audit reports, policies, and legal documents. Public materials are available instantly; confidential materials are shared under NDA.`;
}

// Expiry Date for a freshly-issued download grant, honoring the configured TTL.
export async function grantExpiryDate(): Promise<Date> {
  const { grantTtlMinutes } = await getOrgSettings();
  return new Date(Date.now() + grantTtlMinutes * 60_000);
}

export async function getOrgSettings(): Promise<ResolvedSettings> {
  const row = await prisma.orgSettings
    .findUnique({ where: { id: "singleton" } })
    .catch(() => null);
  const companyName = row?.companyName || process.env.COMPANY_NAME || "Acme Corp";
  return {
    companyName,
    tagline: row?.tagline || "Security, privacy, and compliance — transparent by default.",
    overview: row?.overview || defaultOverview(companyName),
    supportEmail: row?.supportEmail ?? null,
    statusPageUrl: row?.statusPageUrl ?? null,
    primaryColor: row?.primaryColor ?? null,
    showSubprocessors: row?.showSubprocessors ?? true,
    showKnowledge: row?.showKnowledge ?? true,
    showUpdates: row?.showUpdates ?? true,
    grantTtlMinutes: row?.grantTtlMinutes ?? 15,
    approvalMode: row?.approvalMode === "manual" ? "manual" : "auto",
    watermarkEnabled: row?.watermarkEnabled ?? true,
    customerNdaBypass: row?.customerNdaBypass ?? false,
    retentionNote: row?.retentionNote ?? null,
  };
}
