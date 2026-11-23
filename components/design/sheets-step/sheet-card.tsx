import { DesignDecision } from "@/components/design/design-decision";
import { DesignateInline } from "@/components/design/people/designate-inline";
import { SheetActions } from "@/components/design/sheets-step/sheet-actions";
import { SheetFieldRow } from "@/components/design/sheets-step/sheet-field-row";
import { SheetItemRow } from "@/components/design/sheets-step/sheet-item-row";
import { StepSection } from "@/components/shell/journey/step-section";
import { FactRows } from "@/components/ui/fact-row";
import { ReturnCallout } from "@/components/ui/return-callout";
import { VersionCard } from "@/components/ui/version-card";
import type { DesignJourneyContext } from "@/lib/design/journey-context";
import { SHEET_PHASE_TONE } from "@/lib/design/sheet-phase";
import type { SheetView } from "@/lib/design/sheet-views";
import { designSteps } from "@/lib/i18n/fr/design-steps";
import { formatDay, formatShortInstant } from "@/lib/utils/day";

const fr = { designSteps };

const t = fr.designSteps.sheets;

/**
 * One Fiche Livrable in the step (proto ficheCard), folded once
 * transferred: who is responsible (designated in place by the owner) and
 * who validates, its fields one by one, a series' elements, « Soumettre »,
 * the direction's decision, the transfer to the Production.
 */
export function SheetCard({
  ctx,
  view: v,
  canWrite,
}: {
  ctx: DesignJourneyContext;
  view: SheetView;
  canWrite: boolean;
}) {
  const { facts, phase } = v;
  const sheet = facts.sheet;
  const projectId = ctx.project.id;
  const me = ctx.access.personId;
  const isResponsible = v.responsible?.personId === me;
  const validator = v.validators[0] ?? null;
  const editable = canWrite && isResponsible && phase.editable;
  const latest = facts.versions.find((x) => x.status !== "withdrawn") ?? null;
  const last = latest?.decisions.at(-1) ?? null;
  const transferredAt = facts.handoffs[0]?.confirmedAt ?? null;
  // Only the project's owner designates (assign_design_responsible).
  const designatedBy = ctx.owner?.name ?? null;
  const status =
    phase.phase === "transferred"
      ? { tone: SHEET_PHASE_TONE.transferred, label: t.phases.transferred }
      : { tone: SHEET_PHASE_TONE[phase.phase], label: t.phases[phase.phase] };
  return (
    <VersionCard
      id={`sheet-${sheet.id}`}
      title={sheet.title}
      status={status}
      meta={sheet.kind === "series" ? t.series(facts.items.length) : t.single}
      defaultOpen={phase.phase !== "transferred"}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 text-body-sm">
        {v.responsible ? (
          <span>
            {t.responsible} :{" "}
            <b className="font-semibold">{v.responsible.name}</b>
            {designatedBy && (
              <span className="text-[color:var(--text-tertiary)]">
                {" "}
                · {t.designatedBy(designatedBy)}
              </span>
            )}
          </span>
        ) : ctx.isOwner && canWrite ? (
          <div className="min-w-0 flex-1">
            <DesignateInline
              projectId={projectId}
              scope="sheet"
              sheetId={sheet.id}
              name={`responsible-${sheet.id}`}
              label={t.responsibleLabel}
              members={ctx.people.members}
              suggestion={
                ctx.people.direction.responsible
                  ? {
                      personId: ctx.people.direction.responsible.personId,
                      name: ctx.people.direction.responsible.name,
                    }
                  : null
              }
              hint={
                ctx.people.direction.responsible
                  ? t.suggestion(ctx.people.direction.responsible.name)
                  : t.noSuggestion
              }
              done={Object.fromEntries(
                ctx.people.members.map((m) => [
                  m.personId,
                  t.designated(m.name, sheet.title),
                ]),
              )}
            />
          </div>
        ) : (
          <span className="font-semibold text-error">
            {t.toDesignate(ctx.owner?.name ?? "—")}
          </span>
        )}
        <span className="text-[length:var(--type-micro)] leading-[var(--type-micro-lh)] text-[color:var(--text-tertiary)]">
          {t.validation(validator?.name ?? "—", phase.version)}
        </span>
      </div>
      {v.deliverable?.status === "to_qualify" && (
        <p className="text-caption text-[color:var(--text-secondary)]">
          {t.toQualify(
            fr.designSteps.home.addedBy(
              v.deliverable.origin === "strategy"
                ? ""
                : fr.designSteps.home.form.origins[v.deliverable.origin],
              ctx.nameOf(v.deliverable.createdBy) || "—",
              v.deliverable.note ?? "—",
            ),
          )}
        </p>
      )}
      {(phase.phase === "changes" || phase.phase === "refused") && last && (
        <ReturnCallout
          by={ctx.nameOf(last.decidedBy) || "—"}
          outcome={
            phase.phase === "refused"
              ? t.refuse.toLowerCase()
              : t.changes.toLowerCase()
          }
          note={last.comment ?? ""}
        />
      )}
      <FactRows>
        {v.fields.map((f) => (
          <SheetFieldRow
            key={f.key}
            projectId={projectId}
            sheetId={sheet.id}
            field={f}
            editable={editable}
          />
        ))}
      </FactRows>
      {v.items.length > 0 && (
        <StepSection title={t.series_}>
          <FactRows>
            {v.items.map((item) => {
              const date = item.publish_date ?? item.proposedDate?.date ?? null;
              return (
                <SheetItemRow
                  key={item.id}
                  projectId={projectId}
                  item={{
                    id: item.id,
                    objective: item.objective,
                    date: item.publish_date,
                  }}
                  line={t.itemLine(item.title, status.label)}
                  dateText={date ? formatDay(date) : null}
                  dateSource={
                    item.publish_date
                      ? null
                      : (item.proposedDate?.source ?? null)
                  }
                  editable={editable}
                />
              );
            })}
          </FactRows>
        </StepSection>
      )}
      <SheetActions
        projectId={projectId}
        sheetId={sheet.id}
        title={sheet.title}
        submit={
          editable
            ? phase.phase === "changes" || phase.phase === "refused"
              ? t.resubmit
              : t.submitTo(validator?.name ?? "—")
            : null
        }
        missing={v.missing}
        transfer={
          canWrite &&
          ctx.isOwner &&
          phase.phase === "approved" &&
          phase.transferred !== phase.version
        }
        newVersion={
          canWrite &&
          isResponsible &&
          (phase.phase === "approved" || phase.phase === "transferred")
            ? phase.version + 1
            : null
        }
      />
      {phase.phase === "submitted" &&
        latest &&
        v.validators.some((x) => x.personId === me) && (
          <DesignDecision
            id={`sheet-decision-${sheet.id}`}
            projectId={projectId}
            submissionId={latest.id}
            title={null}
            labels={{
              approve: t.approve(phase.version),
              changes: t.changes,
              refuse: t.refuse,
              approved: t.approvedDone(sheet.title),
              changed: t.changesDone,
              refused: t.refusedDone,
            }}
            commentLabel={t.comment}
            commentHint={t.commentHint}
            commentRequired={t.changesRequired}
          />
        )}
      {phase.transferred !== null && transferredAt && (
        <p className="text-caption text-[color:var(--text-secondary)]">
          {t.transferred(
            ctx.owner?.name ?? "—",
            formatShortInstant(transferredAt),
            phase.transferred,
          )}
          {phase.version > phase.transferred && (
            <b className="font-semibold">
              {" "}
              · {t.newerNotTransferred(phase.version)}
            </b>
          )}
        </p>
      )}
    </VersionCard>
  );
}
