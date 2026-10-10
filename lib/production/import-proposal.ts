// Production: « Importer une organisation existante ». What PO proposes from
// a pasted text, and what the person sends back once reviewed (parsed again
// by the server: what comes back from the browser is never trusted).
// Client-safe.

import { z } from "zod";

import {
  BRIEF_TEXT_FIELDS,
  CAMERA_SETUPS,
  COVERAGES,
  MAX_BRIEF_TEXT,
  SOUND_CAPTURES,
  type BriefTextField,
} from "@/lib/production/brief";
import {
  FAMILY_ROLES,
  MAX_HEADCOUNT,
  NEED_FAMILIES,
  type NeedFamily,
  type RoleKey,
} from "@/lib/production/roles";

export const MAX_IMPORT_TEXT = 20000;
export const MAX_IMPORT_NEEDS = 30;
export const MAX_NEED_LABEL = 120;

export const BRIEF_CHOICE_FIELDS = [
  "coverage",
  "cameraSetup",
  "soundCapture",
] as const;
export type BriefChoiceField = (typeof BRIEF_CHOICE_FIELDS)[number];

export const CHOICE_VALUES: Record<BriefChoiceField, readonly string[]> = {
  coverage: COVERAGES,
  cameraSetup: CAMERA_SETUPS,
  soundCapture: SOUND_CAPTURES,
};

export type ImportBriefField = BriefChoiceField | BriefTextField;

/** One value for the brief, its quote found in the pasted text. Never the
 * value already there; the dialog shows the one it would replace. */
export type ImportBriefProposal = {
  id: string;
  field: ImportBriefField;
  value: string;
  quote: string;
};

/** One position read in the text: never a count, never a person. */
export type ImportNeedProposal = {
  id: string;
  family: NeedFamily;
  roleKey: RoleKey;
  label: string | null;
  speciality: string | null;
  quote: string;
};

export type ProductionImportProposals = {
  brief: ImportBriefProposal[];
  needs: ImportNeedProposal[];
};

export const isChoiceField = (
  field: ImportBriefField,
): field is BriefChoiceField =>
  (BRIEF_CHOICE_FIELDS as readonly string[]).includes(field);

const briefChange = z
  .object({
    field: z.enum([...BRIEF_CHOICE_FIELDS, ...BRIEF_TEXT_FIELDS]),
    value: z.string().trim().min(1).max(MAX_BRIEF_TEXT),
  })
  .refine(
    (c) => !isChoiceField(c.field) || CHOICE_VALUES[c.field].includes(c.value),
  );

const label = z.string().trim().min(1).max(MAX_NEED_LABEL).nullable();

const needChange = z
  .object({
    family: z.enum(NEED_FAMILIES),
    roleKey: z.string(),
    label,
    speciality: label,
    headcount: z.number().int().min(1).max(MAX_HEADCOUNT),
  })
  .refine((n) =>
    (FAMILY_ROLES[n.family] as readonly string[]).includes(n.roleKey),
  )
  .refine((n) => n.roleKey !== "other" || n.label !== null)
  .refine((n) => n.speciality === null || n.family === "performers");

export const applyImportSchema = z.object({
  projectId: z.uuid(),
  sheetId: z.uuid(),
  // One value per topic at most.
  brief: z
    .array(briefChange)
    .refine((list) => new Set(list.map((c) => c.field)).size === list.length),
  needs: z.array(needChange).max(MAX_IMPORT_NEEDS),
});

export type ApplyImportInput = z.input<typeof applyImportSchema>;
