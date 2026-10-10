import { EmptyNote } from "@/components/shell/empty-state";
import { formatDateTime } from "@/lib/calls/format";
import type { SheetEvent } from "@/lib/design/sheet-summaries";
import { fr } from "@/lib/i18n/fr";

const t = fr.conceptionSheet;

// Columns of design_sheets, by the label the form gives them.
const COLUMN_LABELS: Record<string, string> = {
  title: t.fields.title,
  kind: t.header.type,
  concept: t.fields.concept,
  intention: t.fields.intention,
  duration_min_seconds: t.fields.duration,
  duration_max_seconds: t.fields.duration,
  ratios: t.fields.ratios,
  subtitles: t.fields.subtitles,
  subtitle_ratios: t.fields.subtitleRatios,
  subtitle_mode: t.fields.subtitleMode,
  variants: t.fields.variants,
  notes: t.fields.notes,
  constraints: t.fields.constraints,
  shoot_date: t.fields.shootDate,
  post_start: t.fields.postStart,
  post_deadline: t.fields.postDeadline,
  delivery_date: t.fields.deliveryDate,
  budget_cents: t.fields.budget,
  budget_state: t.fields.budgetState,
  dependencies: t.fields.dependencies,
  production_notes: t.fields.productionNotes,
};

/** The sentence of one event, written by code from what the trigger kept. */
function sentence(event: SheetEvent): string {
  const e = t.history.events;
  const data =
    event.data && typeof event.data === "object" && !Array.isArray(event.data)
      ? (event.data as Record<string, unknown>)
      : {};
  const number = typeof data.number === "number" ? data.number : 0;
  switch (event.kind) {
    case "deliverable_sheet.updated": {
      const fields = Array.isArray(data.fields) ? data.fields : [];
      const labels = [
        ...new Set(fields.map((f) => COLUMN_LABELS[String(f)] ?? String(f))),
      ];
      return e["deliverable_sheet.updated"](labels.join(", "));
    }
    case "deliverable_sheet.submitted":
    case "deliverable_sheet.approved":
    case "deliverable_sheet.changes_requested":
    case "deliverable_sheet.rejected":
      return e[event.kind](number);
    case "deliverable_sheet.created":
    case "decision.approved":
    case "decision.changes_requested":
    case "decision.rejected":
    case "assignment.confirmed":
    case "production_handoff.confirmed":
      return e[event.kind];
    default:
      return t.history.other;
  }
}

/** The history of a Fiche Livrable, newest first (written by triggers). */
export function SheetHistory({
  events,
  nameOf,
}: {
  events: SheetEvent[];
  nameOf: (personId: string | null) => string;
}) {
  if (events.length === 0) return <EmptyNote>{t.history.empty}</EmptyNote>;
  return (
    <ol className="flex flex-col gap-3">
      {events.map((event) => {
        const name = nameOf(event.actor);
        return (
          <li key={event.id} className="flex flex-col gap-0.5">
            <span className="text-body-md font-medium break-words">
              {sentence(event)}
            </span>
            <span className="text-caption text-muted-foreground">
              {formatDateTime(event.createdAt)}
              {name && t.history.by(name)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
