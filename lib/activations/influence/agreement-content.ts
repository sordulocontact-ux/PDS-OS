// The exact version of an express agreement — terms and rights — as its
// public page shows it (get_influence_agreement) and as the owner previews it
// before sending the link (recette of 23/10, MKT-INF-002). Pure, client-safe.

import { z } from "zod";

const rightsSchema = z.object({
  kind: z.enum(["organic", "ads"]),
  platforms: z.array(z.string()),
  supports: z.string().nullable(),
  territory: z.string().nullable(),
  starts_on: z.string().nullable(),
  ends_on: z.string().nullable(),
  remuneration: z.enum(["included", "additional"]),
  remuneration_note: z.string().nullable(),
  modification_allowed: z.boolean(),
  credit_required: z.boolean(),
  restrictions: z.string().nullable(),
});

export const agreementContentSchema = z.object({
  project: z.string(),
  campaign: z.string(),
  creator: z.string(),
  terms: z.object({
    fee: z.number().nullable(),
    currency: z.string(),
    deliverables: z.string().nullable(),
    schedule: z.string().nullable(),
    organic_usage: z.string().nullable(),
    ads_usage: z.string().nullable(),
    exclusivity: z.string().nullable(),
    expenses: z.string().nullable(),
    conditions: z.string().nullable(),
  }),
  rights: z.array(rightsSchema),
});

export type AgreementContent = z.infer<typeof agreementContentSchema>;
