"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import {
  setEquipmentReturnHolder,
  setEquipmentReturnStatus,
} from "@/lib/production/shoot/return-actions";
import type { ReturnLine } from "@/lib/production/shoot/rules";
import type { NetworkOption } from "@/lib/production/sheet";

import {
  HolderSelect,
  holderValue,
} from "@/components/production/holder-select";
import { ShootFormActions } from "./shoot-form-actions";

const t = fr.productionShoot.equipment;

/** « Signaler un incident de retour »: what happened (required). */
export function ReturnIncidentForm({
  projectId,
  line,
  onDone,
}: {
  projectId: string;
  line: ReturnLine;
  onDone: () => void;
}) {
  const [missing, setMissing] = useState(false);
  const [issue, setIssue] = useState<"missing" | "damaged">(
    line.returnIssue ?? "damaged",
  );
  const { pending, error, run } = useWriteSubmit(onDone, t.done);
  const id = `return-${line.id}-incident`;

  function submit(form: HTMLFormElement) {
    const note = String(new FormData(form).get("incidentNote") ?? "").trim();
    setMissing(note === "");
    if (note === "") {
      form.querySelector<HTMLElement>(`#${id}`)?.focus();
      return;
    }
    run(() =>
      setEquipmentReturnStatus({
        projectId,
        equipmentId: line.id,
        status: "incident",
        incidentNote: note,
        issue,
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
        name={`${id}-issue`}
        legend={t.issueLegend}
        value={issue}
        onChange={setIssue}
        choices={(["missing", "damaged"] as const).map((v) => ({
          value: v,
          label: t.issues[v],
        }))}
      />
      <TextareaField
        id={id}
        name="incidentNote"
        label={t.incidentNote}
        aria-required
        rows={3}
        maxLength={1000}
        placeholder={t.incidentPlaceholder}
        defaultValue={line.incidentNote ?? ""}
        error={missing ? t.incidentRequired : undefined}
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

/** « Responsable et échéance »: who brings the line back, before when. */
export function ReturnHolderForm({
  projectId,
  line,
  members,
  contacts,
  onDone,
}: {
  projectId: string;
  line: ReturnLine;
  members: Member[];
  contacts: NetworkOption[];
  onDone: () => void;
}) {
  const [holder, setHolder] = useState(holderValue(line.holder));
  const { pending, error, run } = useWriteSubmit(onDone, t.done);

  function submit(form: HTMLFormElement) {
    const returnDue = String(new FormData(form).get("returnDue") ?? "");
    run(() =>
      setEquipmentReturnHolder({
        projectId,
        equipmentId: line.id,
        holder,
        returnDue,
      }),
    );
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget);
      }}
    >
      <HolderSelect
        id={`return-${line.id}-holder`}
        label={t.holderField}
        noneLabel={fr.productionShoot.incidents.fields.noHolder}
        current={line.holder}
        value={holder}
        onChange={setHolder}
        members={members}
        contacts={contacts}
      />
      <Field
        id={`return-${line.id}-due`}
        name="returnDue"
        label={t.dueField}
        type="date"
        defaultValue={line.returnDue ?? ""}
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
