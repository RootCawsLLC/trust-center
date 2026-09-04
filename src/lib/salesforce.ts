// Salesforce customer matching. In this build the "Salesforce" directory is a
// seeded mock table (MockSalesforceCustomer). Swapping this for a real
// Salesforce query (SOQL over Account by website/domain) is the only change
// needed to go live — the classification logic downstream stays identical.
import { prisma } from "./prisma";

export type Match = {
  isCustomer: boolean;
  customerId: string | null;
  customerName: string | null;
  tier: string | null;
  accountOwner: string | null;
};

const FREEMAIL = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "aol.com",
]);

export function isFreemail(domain: string): boolean {
  return FREEMAIL.has(domain.toLowerCase());
}

export async function matchCustomerByDomain(domain: string): Promise<Match> {
  const d = domain.toLowerCase();
  const customer = await prisma.mockSalesforceCustomer.findFirst({
    where: {
      OR: [{ primaryDomain: d }, { additionalDomains: { has: d } }],
    },
  });
  if (!customer) {
    return {
      isCustomer: false,
      customerId: null,
      customerName: null,
      tier: null,
      accountOwner: null,
    };
  }
  return {
    isCustomer: true,
    customerId: customer.id,
    customerName: customer.accountName,
    tier: customer.tier,
    accountOwner: customer.accountOwner,
  };
}
