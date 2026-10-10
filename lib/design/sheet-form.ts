// The Fiche Livrable form: what the browser sends, checked here, and the
// row it becomes (public.design_sheets). Shared by the form and its action.
// Client-safe.

import { z } from "zod";

import {
  formatDuration,
  formatEuros,
  isRatio,
  parseDuration,
  parseEuros,
  SUBTITLE_MODES,
  type SheetField,
} from "@/lib/design/sheet-fields";

const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);
const day = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v))
  .transform((v) => v || null);

export const sheetFormSchema = z.object({
  title: z.string().trim().min(1).max(200),
  concept: text(4000),
  intention: text(4000),
  durationMin: z.string(),
  durationMax: z.string(),
  ratios: z.array(z.string().trim().refine(isRatio)).max(10),
  subtitles: z.enum(["", "yes", "no"]),
  subtitleRatios: z.array(z.string().trim()).max(10),
  subtitleMode: z.enum(["", ...SUBTITLE_MODES]),
  variants: text(2000),
  notes: text(4000),
  constraints: text(2000),
  shootDate: day,
  postStart: day,
  postDeadline: day,
  deliveryDate: day,
  budget: z.string(),
  budgetState: z.enum(["not_committed", "committed"]),
  dependencies: text(2000),
  productionNotes: text(4000),
});
export type SheetFormInput = z.input<typeof sheetFormSchema>;
// Every value as the form holds it (text inputs, lists, choices).
export type SheetFormValues = Required<{
  [K in keyof SheetFormInput]: NonNullable<SheetFormInput[K]>;
}>;

export type SheetPatch = {
  title: string;
  concept: string | null;
  intention: string | null;
  duration_min_seconds: number | null;
  duration_max_seconds: number | null;
  ratios: string[];
  subtitles: boolean | null;
  subtitle_ratios: string[];
  subtitle_mode: string | null;
  variants: string | null;
  notes: string | null;
  constraints: string | null;
  shoot_date: string | null;
  post_start: string | null;
  post_deadline: string | null;
  delivery_date: string | null;
  budget_cents: number | null;
  budget_state: string;
  dependencies: string | null;
  production_notes: string | null;
};

export type SheetFormError = "duration" | "budget" | "invalid";

/** The row the form becomes, or what is wrong with it. */
export function toSheetPatch(
  input: unknown,
): { ok: true; patch: SheetPatch } | { ok: false; error: SheetFormError } {
  const parsed = sheetFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const v = parsed.data;
  const min = v.durationMin.trim() ? parseDuration(v.durationMin) : null;
  const max = v.durationMax.trim() ? parseDuration(v.durationMax) : null;
  if (
    (v.durationMin.trim() && min === null) ||
    (v.durationMax.trim() && max === null) ||
    (min !== null && max !== null && min > max)
  )
    return { ok: false, error: "duration" };
  const budget = v.budget.trim() ? parseEuros(v.budget) : null;
  if (v.budget.trim() && budget === null) return { ok: false, error: "budget" };
  const subtitles = v.subtitles === "" ? null : v.subtitles === "yes";
  const ratios = [...new Set(v.ratios)];
  return {
    ok: true,
    patch: {
      title: v.title,
      concept: v.concept,
      intention: v.intention,
      duration_min_seconds: min,
      // A single value is a range of one.
      duration_max_seconds: max ?? min,
      ratios,
      subtitles,
      subtitle_ratios: subtitles
        ? [...new Set(v.subtitleRatios)].filter((r) => ratios.includes(r))
        : [],
      subtitle_mode: subtitles && v.subtitleMode ? v.subtitleMode : null,
      variants: v.variants,
      notes: v.notes,
      constraints: v.constraints,
      shoot_date: v.shootDate,
      post_start: v.postStart,
      post_deadline: v.postDeadline,
      delivery_date: v.deliveryDate,
      budget_cents: budget,
      budget_state: v.budgetState,
      dependencies: v.dependencies,
      production_notes: v.productionNotes,
    },
  };
}

/** The fields whose value changed, by provenance key. */
export function changedFields(
  before: Record<string, unknown>,
  patch: SheetPatch,
): SheetField[] {
  const same = (a: unknown, b: unknown) =>
    JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  const groups: Array<[SheetField, Array<keyof SheetPatch>]> = [
    ["title", ["title"]],
    ["concept", ["concept"]],
    ["intention", ["intention"]],
    ["duration", ["duration_min_seconds", "duration_max_seconds"]],
    ["ratios", ["ratios"]],
    ["subtitles", ["subtitles", "subtitle_ratios", "subtitle_mode"]],
    ["variants", ["variants"]],
    ["notes", ["notes"]],
    ["constraints", ["constraints"]],
    ["shoot_date", ["shoot_date"]],
    ["post_start", ["post_start"]],
    ["post_deadline", ["post_deadline"]],
    ["delivery_date", ["delivery_date"]],
    ["budget", ["budget_cents", "budget_state"]],
    ["dependencies", ["dependencies"]],
    ["production_notes", ["production_notes"]],
  ];
  return groups
    .filter(([, keys]) => keys.some((k) => !same(before[k], patch[k])))
    .map(([field]) => field);
}

/** What the form starts from: the sheet as stored. */
export function toFormInput(sheet: {
  title: string;
  concept: string | null;
  intention: string | null;
  duration_min_seconds: number | null;
  duration_max_seconds: number | null;
  ratios: string[];
  subtitles: boolean | null;
  subtitle_ratios: string[];
  subtitle_mode: string | null;
  variants: string | null;
  notes: string | null;
  constraints: string | null;
  shoot_date: string | null;
  post_start: string | null;
  post_deadline: string | null;
  delivery_date: string | null;
  budget_cents: number | null;
  budget_state: string;
  dependencies: string | null;
  production_notes: string | null;
}): SheetFormValues {
  const same =
    sheet.duration_max_seconds === sheet.duration_min_seconds ||
    sheet.duration_max_seconds === null;
  return {
    title: sheet.title,
    concept: sheet.concept ?? "",
    intention: sheet.intention ?? "",
    durationMin: formatDuration(sheet.duration_min_seconds),
    durationMax: same ? "" : formatDuration(sheet.duration_max_seconds),
    ratios: sheet.ratios,
    subtitles: sheet.subtitles === null ? "" : sheet.subtitles ? "yes" : "no",
    subtitleRatios: sheet.subtitle_ratios,
    subtitleMode: (SUBTITLE_MODES as readonly string[]).includes(
      sheet.subtitle_mode ?? "",
    )
      ? (sheet.subtitle_mode as SheetFormValues["subtitleMode"])
      : "",
    variants: sheet.variants ?? "",
    notes: sheet.notes ?? "",
    constraints: sheet.constraints ?? "",
    shootDate: sheet.shoot_date ?? "",
    postStart: sheet.post_start ?? "",
    postDeadline: sheet.post_deadline ?? "",
    deliveryDate: sheet.delivery_date ?? "",
    budget: sheet.budget_cents === null ? "" : formatEuros(sheet.budget_cents),
    budgetState:
      sheet.budget_state === "committed" ? "committed" : "not_committed",
    dependencies: sheet.dependencies ?? "",
    productionNotes: sheet.production_notes ?? "",
  };
}

/** How a field group of the form changes one value. */
export type SetSheetValue = <K extends keyof SheetFormValues>(
  key: K,
  value: SheetFormValues[K],
) => void;
