import type { DocumentCategory } from "@prisma/client";

export const CATEGORY_LABELS: Record<DocumentCategory, string> = {
  POLICY: "Policies",
  PROCEDURE: "Procedures",
  AUDIT: "Audits & Reports",
  CERTIFICATION: "Certifications",
  REPORT: "Reports",
  WHITEPAPER: "Whitepapers",
  OTHER: "Other",
};

export const CATEGORY_ORDER: DocumentCategory[] = [
  "CERTIFICATION",
  "AUDIT",
  "REPORT",
  "POLICY",
  "PROCEDURE",
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
  OTHER: "Document",
};

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
