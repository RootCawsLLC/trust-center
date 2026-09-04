import { z } from "zod";

// ISO 3166-ish free-text country is accepted; we keep it simple but non-empty.
export const downloadRequestSchema = z.object({
  documentId: z.string().min(1),
  requesterName: z.string().min(2, "Please enter your full name").max(120),
  requesterEmail: z.string().email("Enter a valid work email").max(200),
  orgName: z.string().min(2, "Enter your organization").max(160),
  country: z.string().min(2, "Select your country").max(80),
});

export type DownloadRequestInput = z.infer<typeof downloadRequestSchema>;

export const ndaAcceptSchema = z.object({
  requestId: z.string().min(1),
  signerName: z.string().min(2, "Type your full name to sign").max(120),
  agreed: z.literal(true, {
    errorMap: () => ({ message: "You must accept the NDA to continue" }),
  }),
});

export const documentSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  category: z.enum([
    "POLICY",
    "PROCEDURE",
    "AUDIT",
    "CERTIFICATION",
    "REPORT",
    "WHITEPAPER",
    "LEGAL",
    "OTHER",
  ]),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
  version: z.string().max(40).optional().or(z.literal("")),
  isPublished: z.coerce.boolean().optional(),
  ndaTemplateId: z.string().optional().or(z.literal("")),
});

export const userSchema = z.object({
  email: z.string().email().max(200),
  name: z.string().min(1).max(120),
  role: z.enum(["OWNER", "ADMIN", "VIEWER"]),
  password: z.string().min(10, "Use at least 10 characters").max(200).optional().or(z.literal("")),
});

export const ndaTemplateSchema = z.object({
  name: z.string().min(2).max(160),
  bodyMarkdown: z.string().min(20, "NDA body looks too short").max(50000),
  isDefault: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
});
