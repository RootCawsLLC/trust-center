import type { DocumentCategory } from "@prisma/client";

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  POLICY: "Policies",
  PROCEDURE: "Procedures",
  AUDIT: "Audits & Reports",
  CERTIFICATION: "Certifications",
  REPORT: "Reports",
  WHITEPAPER: "Whitepapers",
  LEGAL: "Legal",
  OTHER: "Other",
};

export const CATEGORY_ORDER: DocumentCategory[] = [
  "CERTIFICATION",
  "AUDIT",
  "REPORT",
  "POLICY",
  "PROCEDURE",
  "LEGAL",
  "WHITEPAPER",
  "OTHER",
];

export const CATEGORY_SINGULAR: Record<DocumentCategory, string> = {
  POLICY: "Policy",
  PROCEDURE: "Procedure",
  AUDIT: "Audit",
  CERTIFICATION: "Certification",
  REPORT: "Report",
  WHITEPAPER: "Whitepaper",
  LEGAL: "Legal",
  OTHER: "Document",
};

// Taxonomy vocabularies — power the admin tagging and the customer-facing
// "filter by industry / region / framework" facets.
export const INDUSTRIES = [
  "Healthcare",
  "Financial Services",
  "Public Sector",
  "Technology",
  "Retail & E-commerce",
  "Education",
  "Manufacturing",
  "Energy & Utilities",
];

export const REGIONS = [
  "North America",
  "European Union",
  "United Kingdom",
  "APAC",
  "LATAM",
  "Middle East & Africa",
  "Global",
];

export const FRAMEWORKS = [
  "SOC 2",
  "ISO 27001",
  "ISO 27701",
  "HIPAA",
  "HITRUST",
  "PCI DSS",
  "GDPR",
  "CCPA",
  "NIST CSF",
  "FedRAMP",
  "EU AI Act",
];

// A pragmatic country list for the gated form. "Other" is always allowed.
export const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Ireland",
  "Germany",
  "France",
  "Netherlands",
  "Spain",
  "Italy",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Switzerland",
  "Austria",
  "Belgium",
  "Poland",
  "Portugal",
  "Australia",
  "New Zealand",
  "Japan",
  "Singapore",
  "India",
  "Brazil",
  "Mexico",
  "United Arab Emirates",
  "Israel",
  "South Africa",
  "Other",
];

// Document lifecycle statuses. Lives here (a plain module) rather than in the
// "use client" DocumentManager: a Server Component that imports a value from a
// client module gets a client-reference proxy, not the array, so `.map` throws.
export const DOC_STATUSES = [
  "Draft",
  "In review",
  "Planning",
  "Published",
  "Archived",
  "Revoked",
] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

export const KB_CATEGORIES = [
  "General",
  "Security",
  "Privacy",
  "Compliance",
  "Infrastructure",
  "Data handling",
  "Product",
  "Legal",
] as const;
