import { z } from "zod";

import { auth } from "@/lib/i18n/fr/auth";
import { shell } from "@/lib/i18n/fr/shell";
import {
  CONTENT_MODES,
  MUSIC_FORMATS,
  PRIORITIES,
  PROJECT_TYPES,
} from "@/lib/projects/types";

const fr = { auth, shell };

const e = fr.auth.errors;
const pe = fr.shell.newProject.errors;

// "1 500,50" / "1500.5" / "1500" → cents. Undefined when not an amount,
// null when empty.
export function parseEurosToCents(input: string): number | null | undefined {
  const value = input.replace(/[\s  €]/g, "").replace(",", ".");
  if (value === "") return null;
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value)) return undefined;
  return Math.round(Number(value) * 100);
}

// Lists of ids travel as one JSON field (FormData flattens repeated keys).
function uuidListSchema(message: string, max: number) {
  return z
    .string()
    .optional()
    .transform((raw, ctx) => {
      try {
        return JSON.parse(raw || "[]") as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message });
        return z.NEVER;
      }
    })
    .pipe(z.array(z.uuid(), { error: message }).max(max));
}

// An optional choice: empty → null, otherwise one of the values.
function optionalEnum<T extends readonly [string, ...string[]]>(
  values: T,
  message: string,
) {
  return z
    .string()
    .optional()
    .transform((value) => value || null)
    .pipe(z.enum(values, { error: message }).nullable());
}

function optionalUuid(message: string) {
  return z
    .string()
    .optional()
    .transform((value) => value || null)
    .pipe(z.uuid({ error: message }).nullable());
}

// Fields shared by creation and editing (before launch).
const projectFields = {
  title: z
    .string({ error: e.required })
    .trim()
    .min(1, { error: e.required })
    .max(200, { error: e.tooLong }),
  type: z.enum(PROJECT_TYPES, { error: pe.invalidType }),
  masterIds: uuidListSchema(pe.invalidMasters, 50),
  dueDate: z
    .string()
    .optional()
    .transform((value) => value || null)
    .pipe(z.iso.date({ error: pe.invalidDate }).nullable()),
  budget: z
    .string()
    .optional()
    .transform((value, ctx) => {
      const cents = parseEurosToCents(value ?? "");
      if (cents === undefined) {
        ctx.addIssue({ code: "custom", message: pe.invalidBudget });
        return z.NEVER;
      }
      return cents;
    }),
  priority: optionalEnum(PRIORITIES, pe.invalidPriority),
  musicFormat: optionalEnum(MUSIC_FORMATS, pe.musicFormatRequired),
  contentMode: optionalEnum(CONTENT_MODES, pe.contentModeRequired),
  contentFormatId: optionalUuid(pe.invalidContentFormat),
  artistId: optionalUuid(pe.invalidArtist),
  // « Projet collectif » (lot 5 of docs/pds-mic-plan.md): its main artist,
  // whatever the type, and the selection whose artists it copies.
  collective: z
    .string()
    .optional()
    .transform((value) => value === "on" || value === "true"),
  mainArtistId: optionalUuid(pe.invalidMainArtist),
  selectionId: optionalUuid(pe.selectionNotFound),
  initialContext: z
    .string()
    .trim()
    .max(20000, { error: e.tooLong })
    .optional()
    .transform((value) => value || null),
};

type Shape = {
  type: string;
  masterIds: string[];
  musicFormat: string | null;
  contentMode: string | null;
  contentFormatId: string | null;
  collective: boolean;
  mainArtistId: string | null;
};

// What the type asks for (check_project_shape holds the same rules in SQL):
// a music project names its format and links masters, one for a single; a
// content project is an edition of a format or a one-off content.
function checkShape(data: Shape, ctx: z.RefinementCtx) {
  const issue = (path: string, message: string) =>
    ctx.addIssue({ code: "custom", path: [path], message });
  const masters = new Set(data.masterIds).size;
  if (data.type === "music_release") {
    if (!data.musicFormat) issue("musicFormat", pe.musicFormatRequired);
    if (masters === 0) issue("masterIds", pe.mastersRequired);
    else if (data.musicFormat === "single" && masters > 1)
      issue("masterIds", pe.singleOneMaster);
  }
  if (data.type === "content") {
    if (!data.contentMode) issue("contentMode", pe.contentModeRequired);
    else if (data.contentMode === "format" && !data.contentFormatId)
      issue("contentFormatId", pe.contentFormatRequired);
  }
  // A collective is credited to its main artist on every title: never
  // without one (set_project_main_artist refuses it too).
  if (data.collective && !data.mainArtistId)
    issue("mainArtistId", pe.mainArtistRequired);
}

// What is saved, whatever else the form still holds: the fields of the
// other type are dropped (the database does the same). A collective names
// its main artist instead of a content's artist; any other project has
// neither main artist nor selection.
function normalize<
  T extends Shape & { artistId: string | null; selectionId: string | null },
>(data: T) {
  const music = data.type === "music_release";
  const content = data.type === "content";
  return {
    ...data,
    masterIds: music ? data.masterIds : [],
    musicFormat: music ? data.musicFormat : null,
    contentFormatId:
      content && data.contentMode === "format" ? data.contentFormatId : null,
    artistId: content && !data.collective ? data.artistId : null,
    mainArtistId: data.collective ? data.mainArtistId : null,
    selectionId: data.collective ? data.selectionId : null,
  };
}

export const createProjectSchema = z
  .object({
    ...projectFields,
    // Transmitted at creation: the project always starts with its manager.
    assigneePersonId: z.uuid({ error: pe.managerRequired }),
    creativePersonIds: uuidListSchema(pe.invalidCreatives, 20),
    // Who validates the Master's versions (retour d'Ibé du 02/11/2026): the
    // manager or a creative director chosen here, the database checks it too.
    masterValidatorPersonId: optionalUuid(pe.invalidMasterValidator),
  })
  .superRefine((data, ctx) => {
    // The event branch is closed in V1.
    if (data.type === "event")
      ctx.addIssue({
        code: "custom",
        path: ["type"],
        message: pe.typeUnavailable,
      });
    checkShape(data, ctx);
    const validator = data.masterValidatorPersonId;
    if (
      data.type === "music_release" &&
      validator &&
      validator !== data.assigneePersonId &&
      !data.creativePersonIds.includes(validator)
    )
      ctx.addIssue({
        code: "custom",
        path: ["masterValidatorPersonId"],
        message: pe.invalidMasterValidator,
      });
  })
  // Only a music release has a Master (it works on the titles it links).
  .transform((data) => ({
    ...normalize(data),
    masterValidatorPersonId:
      data.type === "music_release" ? data.masterValidatorPersonId : null,
  }));

// Before launch only; the team changes by transmission, not here.
export const updateProjectSchema = z
  .object({ ...projectFields, projectId: z.uuid() })
  .superRefine(checkShape)
  .transform(normalize);

export const projectIdSchema = z.uuid();
