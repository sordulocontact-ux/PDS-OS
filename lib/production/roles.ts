// Production: the human needs of a deliverable (ticket « Workflow Production
// complet », parcours 3). Five families, never image and sound together; each
// family has preset positions plus « other » with its own label. Same lists
// as the database (supabase/migrations/20261010003001_production_preparation.sql).
// Client-safe.

import type { ProductionBriefChoices } from "@/lib/production/brief";

export const NEED_FAMILIES = [
  "direction",
  "camera",
  "sound",
  "performers",
  "production",
] as const;
export type NeedFamily = (typeof NEED_FAMILIES)[number];

// The director is designated on the brief (production_sheets), not here:
// Réalisation lists the positions around them.
export const FAMILY_ROLES = {
  direction: ["assistant_director", "script", "other"],
  camera: [
    "camera_operator",
    "dop",
    "gaffer",
    "camera_assistant",
    "data_wrangler",
    "other",
  ],
  sound: [
    "sound_engineer",
    "boom_operator",
    "sound_assistant",
    "live_mix",
    "other",
  ],
  // Generic categories; the instrument or part is the need's speciality.
  performers: ["musician", "singer", "dancer", "actor", "extra", "other"],
  production: [
    "coordinator",
    "logistics",
    "call_sheet",
    "hospitality",
    "other",
  ],
} as const satisfies Record<NeedFamily, readonly string[]>;

export type RoleKey = (typeof FAMILY_ROLES)[NeedFamily][number];

export function isNeedFamily(value: unknown): value is NeedFamily {
  return (
    typeof value === "string" &&
    (NEED_FAMILIES as readonly string[]).includes(value)
  );
}

export function isRoleOf(family: NeedFamily, value: unknown): value is RoleKey {
  return (
    typeof value === "string" &&
    (FAMILY_ROLES[family] as readonly string[]).includes(value)
  );
}

/** Only a performer has a speciality (« Guitare » for a Musicien). */
export const hasSpeciality = (family: NeedFamily) => family === "performers";

export const MAX_HEADCOUNT = 50;

// Who in the Réseau usually holds a family's positions: PO proposes these
// contacts first (« profils connus »), never assigns them.
export const FAMILY_NETWORK_ROLES: Record<NeedFamily, readonly string[]> = {
  direction: ["videographer"],
  camera: ["videographer", "photographer"],
  sound: ["engineer", "producer"],
  performers: ["musician", "artist"],
  production: ["provider", "manager", "other"],
};

export type NeedSuggestion = {
  family: NeedFamily;
  roleKey: RoleKey;
  // Why PO suggests it: the brief choice it follows from (an i18n key).
  because: "always" | "multi" | "live" | "one_take";
};

/**
 * The positions PO suggests, written by code from the brief's closed
 * choices — never a count, never a person. A suggestion already covered by
 * a need of the same position disappears.
 */
export function suggestNeeds(
  choices: ProductionBriefChoices,
  existing: ReadonlyArray<{ family: NeedFamily; roleKey: string }>,
): NeedSuggestion[] {
  const all: NeedSuggestion[] = [
    { family: "direction", roleKey: "assistant_director", because: "always" },
    { family: "camera", roleKey: "camera_operator", because: "always" },
    { family: "production", roleKey: "coordinator", because: "always" },
  ];
  if (choices.cameraSetup === "multi") {
    all.push(
      { family: "camera", roleKey: "dop", because: "multi" },
      { family: "camera", roleKey: "data_wrangler", because: "multi" },
    );
  }
  if (choices.coverage === "one_take") {
    all.push({
      family: "camera",
      roleKey: "camera_assistant",
      because: "one_take",
    });
  }
  if (choices.soundCapture === "live" || choices.soundCapture === "mixed") {
    all.push(
      { family: "sound", roleKey: "sound_engineer", because: "live" },
      { family: "sound", roleKey: "boom_operator", because: "live" },
      { family: "performers", roleKey: "musician", because: "live" },
    );
  }
  const taken = new Set(existing.map((n) => `${n.family}:${n.roleKey}`));
  return all.filter((s) => !taken.has(`${s.family}:${s.roleKey}`));
}
