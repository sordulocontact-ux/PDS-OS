import { z } from "zod";

import { fr } from "@/lib/i18n/fr";
import { PRIORITIES, PROJECT_TYPES } from "@/lib/projects/types";

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
  priority: z
    .string()
    .optional()
    .transform((value) => value || null)
    .pipe(z.enum(PRIORITIES, { error: pe.invalidPriority }).nullable()),
  framingNotes: z
    .string()
    .trim()
    .max(20000, { error: e.tooLong })
    .optional()
    .transform((value) => value || null),
};

// The rule that defines a music release; the database enforces it too.
function requireMasterForRelease(
  data: { type: string; masterIds: string[] },
  ctx: z.RefinementCtx,
) {
  if (data.type === "music_release" && data.masterIds.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["masterIds"],
      message: pe.mastersRequired,
    });
  }
}

export const createProjectSchema = z
  .object({
    ...projectFields,
    // Transmitted at creation: the project always starts with its manager.
    assigneePersonId: z.uuid({ error: pe.managerRequired }),
    creativePersonIds: uuidListSchema(pe.invalidCreatives, 20),
  })
  .superRefine(requireMasterForRelease);

// Before launch only; the team changes by transmission, not here.
export const updateProjectSchema = z
  .object({ ...projectFields, projectId: z.uuid() })
  .superRefine(requireMasterForRelease);

export const projectIdSchema = z.uuid();
