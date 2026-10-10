import { ProvenanceTag } from "@/components/design/sheets/provenance-tag";
import type { Fact } from "@/components/ui/fact-list";
import { formatDay } from "@/lib/assistant/facts";
import {
  formatDuration,
  formatEuros,
  type SheetField,
  type SheetProvenance,
} from "@/lib/design/sheet-fields";
import { fr } from "@/lib/i18n/fr";

/** The values of a sheet, as stored (or as a submitted version froze them). */
export type SheetValues = {
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

export type SheetFactGroup = { id: string; title: string; facts: Fact[] };

/**
 * A sheet's values grouped as the page shows them, each one written out
 * and, when known, with where it comes from.
 */
export function sheetFactGroups(
  sheet: SheetValues,
  provenance: SheetProvenance = {},
): SheetFactGroup[] {
  const t = fr.conceptionSheet;
  const f = t.fields;
  const valued = (field: SheetField, value: string | null) =>
    value === null || value === "" ? null : (
      <span className="flex flex-wrap items-center gap-2">
        <span className="break-words whitespace-pre-line">{value}</span>
        {provenance[field] && (
          <ProvenanceTag source={provenance[field].source} />
        )}
      </span>
    );
  const day = (field: SheetField, value: string | null) =>
    valued(field, value ? formatDay(value) : null);
  const duration =
    sheet.duration_min_seconds === null
      ? null
      : t.duration(
          formatDuration(sheet.duration_min_seconds),
          sheet.duration_max_seconds === null
            ? null
            : formatDuration(sheet.duration_max_seconds),
        );
  const mode = sheet.subtitle_mode as keyof typeof f.subtitleModes | null;
  const subtitles =
    sheet.subtitles === null
      ? null
      : sheet.subtitles
        ? [
            f.subtitleChoices.yes,
            sheet.subtitle_ratios.join(", "),
            mode ? f.subtitleModes[mode] : null,
          ]
            .filter(Boolean)
            .join(" · ")
        : f.subtitleChoices.no;
  const state = sheet.budget_state as keyof typeof f.budgetStates;
  const budget =
    sheet.budget_cents === null
      ? null
      : `${t.euros(formatEuros(sheet.budget_cents))} · ${f.budgetStates[state] ?? state}`;

  return [
    {
      id: "creative",
      title: t.sections.creative,
      facts: [
        { label: f.concept, value: valued("concept", sheet.concept) },
        { label: f.intention, value: valued("intention", sheet.intention) },
      ],
    },
    {
      id: "formats",
      title: t.sections.formats,
      facts: [
        { label: f.duration, value: valued("duration", duration) },
        {
          label: f.ratios,
          value: valued("ratios", sheet.ratios.join(", ") || null),
        },
        { label: f.subtitles, value: valued("subtitles", subtitles) },
        { label: f.variants, value: valued("variants", sheet.variants) },
      ],
    },
    {
      id: "dates",
      title: t.sections.dates,
      facts: [
        { label: f.shootDate, value: day("shoot_date", sheet.shoot_date) },
        { label: f.postStart, value: day("post_start", sheet.post_start) },
        {
          label: f.postDeadline,
          value: day("post_deadline", sheet.post_deadline),
        },
        {
          label: f.deliveryDate,
          value: day("delivery_date", sheet.delivery_date),
        },
      ],
    },
    {
      id: "budget",
      title: t.sections.budget,
      facts: [{ label: f.budget, value: valued("budget", budget) }],
    },
    {
      id: "production",
      title: t.sections.production,
      facts: [
        { label: f.notes, value: valued("notes", sheet.notes) },
        {
          label: f.constraints,
          value: valued("constraints", sheet.constraints),
        },
        {
          label: f.dependencies,
          value: valued("dependencies", sheet.dependencies),
        },
        {
          label: f.productionNotes,
          value: valued("production_notes", sheet.production_notes),
        },
      ],
    },
  ];
}
