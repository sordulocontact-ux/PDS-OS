// What the « Paramètres de distribution » show and edit (proto step
// `params`), each value with its source or « Modifié par … », and what is
// still missing before « Confirmer les paramètres ». Pure and client-safe:
// built on the server (lib/distribution/journey-context.ts), read by the
// client rows (components/distribution/params).

import { territoriesText } from "@/lib/distribution/delivery-file";
import type { DossierParams } from "@/lib/distribution/dossier";
import { fr } from "@/lib/i18n/fr";
import { formatDay } from "@/lib/utils/day";

export const PARAM_KEYS = [
  "territories",
  "preorder",
  "prelisten",
  "priceTier",
  "cover",
  "validator",
  "notes",
] as const;
export type ParamKey = (typeof PARAM_KEYS)[number];

// The columns of distribution_dossiers each row stands for.
const COLUMNS: Record<string, ParamKey> = {
  territory_mode: "territories",
  territories: "territories",
  preorder: "preorder",
  preorder_on: "preorder",
  prelisten: "prelisten",
  prelisten_on: "prelisten",
  price_tier: "priceTier",
  cover_sheet_id: "cover",
  notes: "notes",
};

export type ParamsData = {
  projectId: string;
  // The owner, on the step in progress or the dossier being prepared.
  canEdit: boolean;
  releaseDate: string | null;
  releaseDay: string | null;
  params: Omit<DossierParams, "updatedAt">;
  territoriesText: string;
  preorderProposal: { date: string; source: string } | null;
  validator: { personId: string; name: string; proposed: boolean } | null;
  validatorOptions: Array<{ personId: string; name: string }>;
  cover: { id: string; title: string; line: string; chosen: boolean } | null;
  sheets: Array<{ id: string; title: string; line: string }>;
  // The last person who changed each row (the module's journal).
  changedBy: Partial<Record<ParamKey, string>>;
};

/** The parameters still to say: in red after a first try, never before. */
export function missingParams(data: ParamsData): ParamKey[] {
  const p = data.params;
  return [
    p.preorder === null && !data.preorderProposal ? "preorder" : null,
    p.prelisten === null ? "prelisten" : null,
    p.priceTier === null ? "priceTier" : null,
    data.validator ? null : "validator",
  ].filter((key): key is ParamKey => key !== null);
}

/** « Modifié par » of each row, from the newest event that changed it. */
export function changedByOf(
  events: Array<{
    kind: string;
    data: Record<string, unknown>;
    actor: string | null;
  }>,
): Partial<Record<ParamKey, string>> {
  const out: Partial<Record<ParamKey, string>> = {};
  for (const event of events) {
    if (!event.actor) continue;
    if (event.kind === "validator.set") out.validator ??= event.actor;
    if (event.kind !== "dossier.parameters_saved") continue;
    const changed = Array.isArray(event.data.changed) ? event.data.changed : [];
    const values = (event.data.values ?? {}) as Record<string, unknown>;
    for (const column of changed) {
      if (typeof column !== "string" || !COLUMNS[column]) continue;
      // The first save writes the default territories: not a change.
      if (column.startsWith("territor") && values.territory_mode === "world")
        continue;
      out[COLUMNS[column]] ??= event.actor;
    }
  }
  return out;
}

const t = fr.distributionJourney.params;

/** The value of a row, in words (« Oui, à partir du Sam. 14/11/2026 »). */
export function paramValue(data: ParamsData, key: ParamKey): string | null {
  const p = data.params;
  const yesNo = (value: boolean | null, on: string | null) =>
    value === null
      ? null
      : value
        ? on
          ? t.yesOn(formatDay(on))
          : t.yes
        : t.no;
  switch (key) {
    case "territories":
      return data.territoriesText;
    case "preorder":
      return p.preorder === null && data.preorderProposal
        ? t.yesOn(formatDay(data.preorderProposal.date))
        : yesNo(p.preorder, p.preorderOn);
    case "prelisten":
      return yesNo(p.prelisten, p.prelistenOn);
    case "priceTier":
      return p.priceTier
        ? fr.distribution.dossier.priceTiers[p.priceTier]
        : null;
    case "cover":
      return data.cover?.title ?? null;
    case "validator":
      return data.validator?.name ?? null;
    case "notes":
      return p.notes ?? t.none;
  }
}

export { territoriesText };
