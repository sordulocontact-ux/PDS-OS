// Préproduction › Briefs d'équipe (ticket « Workflow Production complet »,
// parcours 4): each team receives the extract that concerns it, computed by
// code from the Fiche Livrable, the director's brief and the sheet — never
// rewritten by PO — plus the team's own fields. « Transmettre » keeps a
// snapshot with the versions it rests on; a later change shows the brief as
// « À retransmettre ». Client-safe.

import type { NeedFamily } from "@/lib/production/roles";
import type { ProductionSheetData } from "@/lib/production/sheet";

import { teamExtract } from "./team-extract";

type Input = Pick<ProductionSheetData, "heritage" | "sheet">;

export const TEAMS = [
  "director",
  "camera",
  "sound",
  "performers",
  "production",
] as const;
export type Team = (typeof TEAMS)[number];

export const isTeam = (value: unknown): value is Team =>
  typeof value === "string" && (TEAMS as readonly string[]).includes(value);

// The need family whose people receive the brief (the director is on the
// sheet, the positions around them in « direction »).
export const TEAM_FAMILY: Record<Team, NeedFamily> = {
  director: "direction",
  camera: "camera",
  sound: "sound",
  performers: "performers",
  production: "production",
};

// The team's own fields, stored in production_team_briefs.fields.
export const TEAM_FIELDS = {
  director: ["notes"],
  camera: ["notes"],
  sound: ["sources", "audioDelivery", "notes"],
  performers: ["arrangement", "rehearsals", "constraints"],
  production: ["notes"],
} as const satisfies Record<Team, readonly string[]>;
export type TeamField = (typeof TEAM_FIELDS)[Team][number];
export const MAX_TEAM_FIELD = 2000;

export type TeamFields = Partial<Record<TeamField, string>>;

/** One line of an extract: its label and value (null = not filled). */
export type ExtractLine = { label: string; value: string | null };

/** What a team receives: the computed extract, its own fields, and the
 * versions it rests on. Also the shape of a transmitted snapshot. */
export type TeamBriefContent = {
  extract: ExtractLine[];
  fields: TeamFields;
  ficheVersion: number | null;
  sourceVersion: number | null;
};

/** Only the team's own keys, trimmed, empty ones left out. */
export function cleanFields(team: Team, raw: unknown): TeamFields {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const out: TeamFields = {};
  for (const key of TEAM_FIELDS[team]) {
    const value = source[key];
    if (typeof value === "string" && value.trim())
      out[key] = value.trim().slice(0, MAX_TEAM_FIELD);
  }
  return out;
}

/** What the team would receive now. */
export function teamBriefContent(
  team: Team,
  input: Input,
  fields: TeamFields,
): TeamBriefContent {
  return {
    extract: teamExtract(team, input),
    fields,
    ficheVersion: input.heritage.fiche?.version ?? null,
    sourceVersion: input.heritage.source?.number ?? null,
  };
}

/** A transmitted snapshot read back; null when it is not one. */
export function snapshotOf(raw: unknown): TeamBriefContent | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.extract)) return null;
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  return {
    extract: o.extract.flatMap((l) => {
      if (!l || typeof l !== "object") return [];
      const line = l as Record<string, unknown>;
      return typeof line.label === "string"
        ? [
            {
              label: line.label,
              value: typeof line.value === "string" ? line.value : null,
            },
          ]
        : [];
    }),
    fields:
      o.fields && typeof o.fields === "object" ? (o.fields as TeamFields) : {},
    ficheVersion: num(o.ficheVersion),
    sourceVersion: num(o.sourceVersion),
  };
}

export type TeamBriefState = "draft" | "transmitted" | "outdated";

// jsonb reorders object keys: compare with keys sorted.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value ?? null);
}

/** Not transmitted, transmitted as it stands, or changed since. */
export function teamBriefState(
  current: TeamBriefContent,
  snapshot: TeamBriefContent | null,
): TeamBriefState {
  if (!snapshot) return "draft";
  return canonical(current) === canonical(snapshot)
    ? "transmitted"
    : "outdated";
}
