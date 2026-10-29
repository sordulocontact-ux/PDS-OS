"use client";

import { IconChevronDown, IconChevronUp } from "nucleo-sharp-essential";

import { OptionSelect } from "@/components/framing/option-select";
import { PlanStepForm } from "@/components/plan/plan-step-form";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { framingIntel } from "@/lib/i18n/fr/framing-intel";
import { framingJourney } from "@/lib/i18n/fr/framing-journey";
import { planSteps } from "@/lib/i18n/fr/plan-steps";
import type { PlanColumn, PlanWorkflow } from "@/lib/plan/propose";
import type { PlanStepValues } from "@/lib/plan/step-actions";

const fr = { dialogs, framingIntel, framingJourney, planSteps };

/**
 * One step of the proposed plan, opened by its « Modifier » (proto « Suite
 * du Cadrage », Sacha 29/10/2026): its group and pilot in place, the rest
 * (executor, due date, dependencies) in « Autres réglages », move it up or
 * down, take it out of the plan, then « Fermer ». Nothing is saved before
 * « Lancer le plan ».
 */
export function PlanRowEditor({
  title,
  column,
  ownerPersonId,
  workflow,
  values,
  withTitle,
  members,
  first,
  last,
  note,
  onChange,
  onApply,
  onMove,
  onRemove,
  onClose,
}: {
  title: string;
  column: PlanColumn;
  ownerPersonId: string | null;
  workflow: PlanWorkflow | null;
  values: PlanStepValues;
  withTitle: boolean;
  members: Array<{ personId: string; name: string }>;
  first: boolean;
  last: boolean;
  // A note of « À anticiper »: no group nor pilot to choose.
  note: boolean;
  onChange: (change: {
    column?: PlanColumn;
    ownerPersonId?: string | null;
  }) => void;
  onApply: (values: PlanStepValues) => Promise<{ ok: true }>;
  onMove: (offset: -1 | 1) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const t = fr.framingIntel.plan;
  const tj = fr.framingJourney.plan;
  const ts = fr.planSteps;
  return (
    <div className="mb-1 flex flex-col gap-3 rounded-lg bg-[var(--surface-soft)] p-3">
      {!note && (
        <div className="grid gap-2 sm:grid-cols-2">
          <OptionSelect
            id={`plan-column-${title}`}
            label={tj.columnOf(title)}
            options={t.columns}
            value={column}
            onChange={(v) => onChange({ column: v as PlanColumn })}
          />
          <OptionSelect
            id={`plan-pilot-${title}`}
            label={tj.pilotOf(title)}
            options={Object.fromEntries(
              members.map((m) => [m.personId, m.name]),
            )}
            value={ownerPersonId ?? ""}
            onChange={(v) => onChange({ ownerPersonId: v || null })}
          />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1">
        {!note && (
          <DialogButton
            label={tj.moreSettings}
            title={ts.editTitle}
            description={ts.editBodyDraft}
            variant="ghost"
            size="sm"
          >
            {(close) => (
              <PlanStepForm
                initial={values}
                workflow={workflow}
                members={members}
                withTitle={withTitle}
                submitLabel={ts.save}
                doneMessage={ts.saved}
                run={onApply}
                onDone={close}
              />
            )}
          </DialogButton>
        )}
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={ts.moveUp}
          disabled={first}
          onClick={() => onMove(-1)}
        >
          <IconChevronUp aria-hidden />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={ts.moveDown}
          disabled={last}
          onClick={() => onMove(1)}
        >
          <IconChevronDown aria-hidden />
        </Button>
        <Button size="sm" variant="ghost" onClick={onRemove}>
          {t.remove}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={onClose}
        >
          {fr.dialogs.close}
        </Button>
      </div>
    </div>
  );
}
