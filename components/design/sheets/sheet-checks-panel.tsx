import { ToneCallout } from "@/components/ui/tone-callout";
import type { SheetChecks } from "@/lib/design/sheet-checks";
import { fr } from "@/lib/i18n/fr";

/**
 * « PO signale » before submitting: what blocks the submission, what to
 * check or arbitrate, and what can wait for Production. Computed by code
 * from the sheet, never a decision.
 */
export function SheetChecksPanel({ checks }: { checks: SheetChecks }) {
  const t = fr.conceptionSheet.checks;
  const list = (items: string[]) => (
    <ul className="flex list-disc flex-col gap-1 pl-5 text-body-md">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
  // One pale note per point: a list never sits inside a paragraph.
  const notes = (items: string[], tone: "danger" | "warning") => (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item}>
          <ToneCallout tone={tone}>{item}</ToneCallout>
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-labelledby="sheet-checks" className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h3 id="sheet-checks" className="text-body-md font-semibold">
          {t.title}
        </h3>
        <p className="text-caption text-muted-foreground">{t.computed}</p>
      </div>
      {checks.blockers.length ? (
        <div className="flex flex-col gap-2">
          <h4 className="text-body-md font-medium">{t.blockersTitle}</h4>
          {notes(
            checks.blockers.map((k) => t.blockers[k]),
            "danger",
          )}
        </div>
      ) : (
        <ToneCallout tone="success">{t.none}</ToneCallout>
      )}
      {checks.warnings.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="text-body-md font-medium">{t.warningsTitle}</h4>
          {notes(
            checks.warnings.map((k) => t.warnings[k]),
            "warning",
          )}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <h4 className="text-body-md font-medium">{t.deferredTitle}</h4>
        {list(checks.deferred.map((k) => t.deferred[k]))}
      </div>
    </section>
  );
}
