"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { FormDialog } from "@/components/ui/form-dialog";
import { fr } from "@/lib/i18n/fr";
import {
  needsMissingSequences,
  SHOOT_STATES,
  startsShoot,
  type ShootRecord,
  type ShootState,
} from "@/lib/production/shoot/rules";
import { saveShootState } from "@/lib/production/shoot/shoot-actions";

import { ShootFormActions } from "./shoot-form-actions";

const t = fr.productionShoot.state;

/** « Modifier » the shoot's state, observations, missing sequences and
 * deviations. A state that starts the shoot is offered only on a sheet
 * « Prête pour tournage » (the database checks it too). */
export function ShootStateDialog({
  projectId,
  sheetId,
  shoot,
  ready,
}: {
  projectId: string;
  sheetId: string;
  shoot: ShootRecord;
  ready: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        {fr.productionShoot.edit}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.dialogTitle}
        description={t.dialogDescription}
        closeLabel={fr.productionShoot.close}
        size="wide"
      >
        <ShootStateForm
          projectId={projectId}
          sheetId={sheetId}
          shoot={shoot}
          ready={ready}
          onDone={() => setOpen(false)}
        />
      </FormDialog>
    </>
  );
}

function ShootStateForm({
  projectId,
  sheetId,
  shoot,
  ready,
  onDone,
}: {
  projectId: string;
  sheetId: string;
  shoot: ShootRecord;
  ready: boolean;
  onDone: () => void;
}) {
  const [state, setState] = useState<ShootState>(shoot.state);
  const [missing, setMissing] = useState(false);
  const [missingDate, setMissingDate] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.done);
  const current = shoot.saved ? shoot.state : null;

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const missingSequences = text("missingSequences");
    const lacks = needsMissingSequences(state) && missingSequences === "";
    // A postponed shoot says when it now takes place (PROD-019).
    const newDate = text("newShootDate");
    const lacksDate = state === "postponed" && newDate === "";
    setMissing(lacks);
    setMissingDate(lacksDate);
    if (lacks || lacksDate) {
      form
        .querySelector<HTMLElement>(
          lacks ? "#shoot-missing" : "#shoot-new-date",
        )
        ?.focus();
      return;
    }
    run(() =>
      saveShootState({
        projectId,
        sheetId,
        state,
        observations: text("observations"),
        missingSequences,
        deviations: text("deviations"),
        newShootDate: state === "postponed" ? newDate : "",
      }),
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      <ChoiceCards
        name="state"
        legend={t.stateLegend}
        required
        columns={3}
        value={state}
        onChange={setState}
        choices={SHOOT_STATES.map((value) => {
          const locked = !ready && startsShoot(current, value);
          return {
            value,
            label: t.labels[value],
            hint: locked ? t.notReadyHint : t.hints[value],
            disabled: locked,
          };
        })}
      />
      <TextareaField
        id="shoot-observations"
        name="observations"
        label={t.observations}
        rows={4}
        maxLength={4000}
        placeholder={t.observationsPlaceholder}
        defaultValue={shoot.observations ?? ""}
      />
      {state === "postponed" && (
        <Field
          id="shoot-new-date"
          name="newShootDate"
          type="date"
          label={t.newShootDate}
          hint={t.newShootDateHint}
          required
          error={missingDate ? t.newShootDateMissing : undefined}
        />
      )}
      <TextareaField
        id="shoot-missing"
        name="missingSequences"
        label={t.missingSequences}
        rows={3}
        maxLength={2000}
        aria-required={needsMissingSequences(state)}
        placeholder={t.missingPlaceholder}
        defaultValue={shoot.missingSequences ?? ""}
        error={missing ? t.missingRequired : undefined}
      />
      <TextareaField
        id="shoot-deviations"
        name="deviations"
        label={t.deviations}
        rows={3}
        maxLength={2000}
        placeholder={t.deviationsPlaceholder}
        defaultValue={shoot.deviations ?? ""}
      />
      <ShootFormActions
        pending={pending}
        error={error}
        submitLabel={fr.productionShoot.save}
        onCancel={onDone}
      />
    </form>
  );
}
