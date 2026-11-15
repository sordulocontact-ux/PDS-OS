// The distribution's own parameters (ticket « Distribution » § 6.5, CA05):
// territories, pre-order, pre-listening, price tier, notes, and which Fiche
// Livrable of the Conception is the cover. Client-safe: the form and the
// server action validate with the same schema.

import { z } from "zod";

import { COUNTRY_CODES } from "@/lib/catalog/countries";

export const TERRITORY_MODES = ["world", "include", "exclude"] as const;
export type TerritoryMode = (typeof TERRITORY_MODES)[number];

// The Orchard's tiers, plus « à confirmer » (Piégée: « catégorie tarifaire à
// confirmer »).
export const PRICE_TIERS = ["front", "mid", "budget", "to_confirm"] as const;
export type PriceTier = (typeof PRICE_TIERS)[number];

// A yes/no not said yet stays null (« À renseigner »), never read as « non ».
export const YES_NO = ["yes", "no"] as const;

export type DossierParams = {
  territoryMode: TerritoryMode;
  territories: string[];
  preorder: boolean | null;
  preorderOn: string | null;
  prelisten: boolean | null;
  prelistenOn: string | null;
  priceTier: PriceTier | null;
  notes: string | null;
  coverSheetId: string | null;
  updatedAt: string | null;
};

export const EMPTY_PARAMS: DossierParams = {
  territoryMode: "world",
  territories: [],
  preorder: null,
  preorderOn: null,
  prelisten: null,
  prelistenOn: null,
  priceTier: null,
  notes: null,
  coverSheetId: null,
  updatedAt: null,
};

const optionalDate = z
  .string()
  .trim()
  .transform((value) => value || null)
  .pipe(z.iso.date().nullable());

const yesNo = z
  .enum(["", ...YES_NO])
  .transform((value) => (value === "" ? null : value === "yes"));

export const dossierParamsSchema = z
  .object({
    projectId: z.uuid(),
    // A collective's release (lot 15).
    releaseId: z.uuid().nullable().optional(),
    territoryMode: z.enum(TERRITORY_MODES),
    territories: z
      .array(z.string().refine((code) => COUNTRY_CODES.has(code)))
      .max(300),
    preorder: yesNo,
    preorderOn: optionalDate,
    prelisten: yesNo,
    prelistenOn: optionalDate,
    priceTier: z
      .enum(["", ...PRICE_TIERS])
      .transform((value) => (value === "" ? null : value)),
    notes: z
      .string()
      .trim()
      .max(2000)
      .transform((value) => value || null),
    coverSheetId: z
      .string()
      .transform((value) => value || null)
      .pipe(z.uuid().nullable()),
  })
  // Same rules as the table (supabase/migrations/20261011100101).
  .transform((value) => ({
    ...value,
    territories:
      value.territoryMode === "world" ? [] : [...new Set(value.territories)],
    preorderOn: value.preorder ? value.preorderOn : null,
    prelistenOn: value.prelisten ? value.prelistenOn : null,
  }))
  .refine(
    (value) => value.territoryMode === "world" || value.territories.length > 0,
    {
      path: ["territories"],
    },
  );

export type DossierParamsInput = z.input<typeof dossierParamsSchema>;

/** A row of distribution_dossiers, as the screens read it. */
export function paramsOf(
  row: {
    territory_mode: string;
    territories: string[];
    preorder: boolean | null;
    preorder_on: string | null;
    prelisten: boolean | null;
    prelisten_on: string | null;
    price_tier: string | null;
    notes: string | null;
    cover_sheet_id: string | null;
    updated_at: string;
  } | null,
): DossierParams {
  if (!row) return EMPTY_PARAMS;
  return {
    territoryMode: (TERRITORY_MODES as readonly string[]).includes(
      row.territory_mode,
    )
      ? (row.territory_mode as TerritoryMode)
      : "world",
    territories: row.territories,
    preorder: row.preorder,
    preorderOn: row.preorder_on,
    prelisten: row.prelisten,
    prelistenOn: row.prelisten_on,
    priceTier: (PRICE_TIERS as readonly string[]).includes(row.price_tier ?? "")
      ? (row.price_tier as PriceTier)
      : null,
    notes: row.notes,
    coverSheetId: row.cover_sheet_id,
    updatedAt: row.updated_at,
  };
}
