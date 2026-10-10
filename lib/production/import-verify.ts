import "server-only";

import { locateQuote } from "@/lib/ai/provenance";
import type { ProductionImportOutput } from "@/lib/ai/schemas/production-import";
import {
  BRIEF_TEXT_FIELDS,
  MAX_BRIEF_TEXT,
  type ProductionBrief,
} from "@/lib/production/brief";
import {
  BRIEF_CHOICE_FIELDS,
  CHOICE_VALUES,
  MAX_IMPORT_NEEDS,
  MAX_NEED_LABEL,
  type ImportBriefProposal,
  type ImportNeedProposal,
  type ProductionImportProposals,
} from "@/lib/production/import-proposal";
import {
  isNeedFamily,
  isRoleOf,
  type NeedFamily,
} from "@/lib/production/roles";

const MAX_QUOTE = 1000;

type ExistingNeed = {
  family: string;
  roleKey: string;
  label: string | null;
  speciality: string | null;
};

const fold = (value: string | null) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const needKey = (n: ExistingNeed) =>
  `${n.family}|${n.roleKey}|${fold(n.label)}|${fold(n.speciality)}`;

/**
 * Keeps only what the code can verify in PO's reading of a pasted text: a
 * quote found in the text, a closed choice from its list, a position of its
 * family, numbers that are all written in the text. A label or a speciality
 * holding a digit is dropped: a count of people is the person's to enter.
 * Pure: nothing is written.
 */
export function verifyProductionImport(
  output: ProductionImportOutput,
  text: string,
  brief: ProductionBrief,
  existing: ExistingNeed[],
): ProductionImportProposals {
  const source = { text, segments: [] };
  const numbers = new Set(text.match(/\d+/g) ?? []);
  const quoteOf = (raw: string): string | null => {
    const quote = raw.trim();
    if (quote.split(/\s+/).length < 3 || quote.length > MAX_QUOTE) return null;
    return locateQuote(quote, source).status === "missing" ? null : quote;
  };
  const numbersSaid = (value: string) =>
    (value.match(/\d+/g) ?? []).every((n) => numbers.has(n));

  const proposals: ImportBriefProposal[] = [];
  for (const field of BRIEF_CHOICE_FIELDS) {
    const item = output[field];
    if (!item) continue;
    const value = item.value.trim().toLowerCase();
    const quote = quoteOf(item.quote);
    if (!quote || !CHOICE_VALUES[field].includes(value)) continue;
    if (brief[field] === value) continue;
    proposals.push({ id: `brief:${field}`, field, value, quote });
  }
  for (const field of BRIEF_TEXT_FIELDS) {
    const item = output[field];
    if (!item) continue;
    const value = item.value.trim();
    const quote = quoteOf(item.quote);
    if (!quote || !value || value.length > MAX_BRIEF_TEXT) continue;
    if (!numbersSaid(value) || fold(brief[field]) === fold(value)) continue;
    proposals.push({ id: `brief:${field}`, field, value, quote });
  }

  const short = (value: string | null | undefined) => {
    const v = value?.trim() ?? "";
    return v && v.length <= MAX_NEED_LABEL && !/\d/.test(v) ? v : null;
  };
  const taken = new Set(existing.map(needKey));
  const needs: ImportNeedProposal[] = [];
  for (const item of output.needs) {
    const family = item.family.trim().toLowerCase();
    const quote = quoteOf(item.quote);
    if (!quote || !isNeedFamily(family)) continue;
    const role = item.role.trim().toLowerCase();
    const label = short(item.label);
    const roleKey = isRoleOf(family, role) ? role : label ? "other" : null;
    if (!roleKey || (roleKey === "other" && !label)) continue;
    const need = {
      family: family satisfies NeedFamily,
      roleKey,
      label: roleKey === "other" ? label : null,
      speciality: family === "performers" ? short(item.speciality) : null,
    };
    const key = needKey(need);
    if (taken.has(key)) continue;
    taken.add(key);
    needs.push({ id: `need:${needs.length}`, ...need, quote });
    if (needs.length >= MAX_IMPORT_NEEDS) break;
  }
  return { brief: proposals, needs };
}
