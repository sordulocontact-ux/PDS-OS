// The terms negotiated in a deal (BIZ 3): THE one place that lists them, by
// kind of deal, with the shape of each value. Ibé's Excel will adjust them:
// add, remove or reorder a term here, nothing else (the database checks only
// the key's form, 20261111231101_deal_terms.sql). Labels are in
// lib/i18n/fr/deals.ts under `terms`. Client-safe.

import { z } from "zod";

import type { DealKind } from "@/lib/deals/types";
import { SPLIT_ROLES } from "@/lib/legal/splits/shares";

/** How a term's value is typed and stored. */
export type TermFormat =
  // Free words (« feat. dans le titre », « Monde hors Japon »).
  | "text"
  // A share, in ten-thousandths of a percent like the Juridique's splits.
  | "percent"
  // An advance or a fee, in cents.
  | "money"
  // Yes or no, with a detail (exclusivity: on what, how long).
  | "yesno"
  // Shares by role, with the Juridique's roles (legal_split_entries.role).
  | "split";

export type TermDefinition = { key: string; format: TermFormat };

/** The terms of each kind of deal, in their order on the page. Only
 * « music » is created in V1: the other kinds have none yet. */
export const DEAL_TERMS: Record<DealKind, readonly TermDefinition[]> = {
  music: [
    { key: "songwriting_split", format: "split" },
    { key: "master_split", format: "percent" },
    { key: "royalties", format: "percent" },
    { key: "advance", format: "money" },
    { key: "credits", format: "text" },
    { key: "territories", format: "text" },
    { key: "duration", format: "text" },
    { key: "exclusivity", format: "yesno" },
    { key: "promo", format: "text" },
  ],
  brand_partnership: [],
  label: [],
};

export function termOf(kind: DealKind, key: string): TermDefinition | null {
  return DEAL_TERMS[kind].find((term) => term.key === key) ?? null;
}

/** Where a term stands in the negotiation. */
export const TERM_STATES = [
  "pds_proposal",
  "counter_proposal",
  "confirmed",
  "to_define",
] as const;
export type TermState = (typeof TERM_STATES)[number];

// 100 % in units (ten-thousandths of a percent).
const FULL = 1_000_000;
const units = z.number().int().positive().max(FULL);

/** The stored value of each format. */
export const TERM_VALUES = {
  text: z.object({ text: z.string().trim().min(1).max(1000) }),
  percent: z.object({ units }),
  money: z.object({
    mode: z.enum(["advance", "fee"]),
    cents: z.number().int().nonnegative().max(100_000_000_000),
  }),
  yesno: z.object({
    yes: z.boolean(),
    detail: z.string().trim().max(1000).nullable(),
  }),
  split: z.object({
    entries: z
      .array(z.object({ role: z.enum(SPLIT_ROLES), units }))
      .min(1)
      .max(SPLIT_ROLES.length)
      .refine(
        (entries) =>
          new Set(entries.map((e) => e.role)).size === entries.length &&
          entries.reduce((sum, e) => sum + e.units, 0) <= FULL,
      ),
  }),
} as const satisfies Record<TermFormat, z.ZodType>;

export type TermValue<F extends TermFormat = TermFormat> = z.infer<
  (typeof TERM_VALUES)[F]
>;

/** A term of a deal as the page reads it; never written: `value` null and
 * « to_define ». */
export type DealTerm = {
  key: string;
  format: TermFormat;
  value: TermValue | null;
  state: TermState;
  changedBy: string | null;
  changedAt: string | null;
};
