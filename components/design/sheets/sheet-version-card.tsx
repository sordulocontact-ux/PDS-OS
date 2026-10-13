import { DecisionControls } from "@/components/design/direction/decision-controls";
import { DecisionLine } from "@/components/design/direction/decision-line";
import {
  sheetFactGroups,
  type SheetValues,
} from "@/components/design/sheets/sheet-facts";
import { FactList } from "@/components/ui/fact-list";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/calls/format";
import type { SheetVersion } from "@/lib/design/sheets";
import { fr } from "@/lib/i18n/fr";
import { designReviewTone } from "@/lib/ui/state-tones";

type Snapshot = {
  sheet: SheetValues & { title: string };
  items: Array<{
    id: string;
    number: number;
    title: string;
    objective: string | null;
  }>;
};

function readSnapshot(value: unknown): Snapshot | null {
  if (!value || typeof value !== "object" || !("sheet" in value)) return null;
  const v = value as Partial<Snapshot>;
  return v.sheet ? { sheet: v.sheet, items: v.items ?? [] } : null;
}

/**
 * One submitted version of a Fiche Livrable, as the database froze it: what
 * the validators read, their decisions per section (the sheet, each item
 * of a series) or on the whole version, and the controls of what is open.
 */
export function SheetVersionCard({
  projectId,
  version: v,
  nameOf,
  isValidator,
  selfSubmitted = false,
  open,
}: {
  projectId: string;
  version: SheetVersion;
  nameOf: (personId: string | null) => string;
  isValidator: boolean;
  // MKT-C2-08: their own version, which they may not decide.
  selfSubmitted?: boolean;
  open: boolean;
}) {
  const t = fr.conceptionSheet.review;
  const snapshot = readSnapshot(v.snapshot);
  const pending = v.status === "pending";
  const decisionOf = (section: string) => {
    const d = v.decisions.find((x) => x.section === section);
    return d
      ? {
          id: `${v.id}-${section}`,
          section,
          decision: d.decision,
          comment: d.comment,
          decidedByName: nameOf(d.decidedBy),
          decidedAt: d.decidedAt,
          reserves: d.reserves,
          decidedRole: d.decidedRole,
        }
      : null;
  };
  const decide = (section: string) => {
    const decision = decisionOf(section);
    if (decision) return <DecisionLine decision={decision} />;
    if (!pending) return null;
    return isValidator ? (
      <DecisionControls
        projectId={projectId}
        submissionId={v.id}
        section={section}
      />
    ) : (
      <p className="text-caption text-muted-foreground">
        {selfSubmitted ? fr.conceptionRoles.selfApproval : t.awaiting}
      </p>
    );
  };
  const sectionTitle = (section: string) =>
    section === "sheet"
      ? t.sectionSheet
      : (snapshot?.items.find((i) => i.id === section)?.title ?? section);

  return (
    <details
      open={open}
      className="group rounded-2xl border border-border bg-background"
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 rounded-2xl px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="text-body-lg font-semibold tabular-nums">
          {t.version(v.number)}
        </span>
        <StatusBadge tone={designReviewTone[v.status]} size="sm">
          {fr.conception.directionStates[v.status]}
        </StatusBadge>
        <span className="text-caption text-muted-foreground">
          {t.submittedBy(nameOf(v.submittedBy), formatDateTime(v.submittedAt))}
          {" · "}
          {fr.conception.validationModes[v.mode]}
        </span>
      </summary>
      <div className="flex flex-col gap-6 px-5 pt-1 pb-5">
        {snapshot && (
          <section className="flex flex-col gap-3">
            <h4 className="text-body-md font-semibold">{t.snapshotTitle}</h4>
            <FactList
              facts={sheetFactGroups(snapshot.sheet).flatMap((g) => g.facts)}
              emptyLabel={fr.conceptionSheet.none}
            />
          </section>
        )}
        {v.mode === "per_section" ? (
          v.sections.map((section) => (
            <section key={section} className="flex flex-col gap-2">
              <h4 className="text-body-md font-semibold">
                {sectionTitle(section)}
              </h4>
              {decide(section)}
            </section>
          ))
        ) : (
          <section className="flex flex-col gap-2">
            <h4 className="text-body-md font-semibold">{t.global}</h4>
            {decide("")}
          </section>
        )}
      </div>
    </details>
  );
}
