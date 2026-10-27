"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { usePickerLoad } from "@/components/network/use-picker-load";
import { Button } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { DialogButton } from "@/components/ui/dialog-button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  decideAgencyRow,
  linkAgencyRow,
} from "@/lib/activations/agency/row-actions";
import { activationAgency } from "@/lib/i18n/fr/activation-agency";
import { activationWork } from "@/lib/i18n/fr/activation-work";
import { activations } from "@/lib/i18n/fr/activations";
import type { RankedPerson } from "@/lib/network/ranked-people";
import { listNetworkForRole } from "@/lib/network/role-people-actions";

const fr = { activations, activationWork, activationAgency };

const t = fr.activationAgency.gallery;
type Decision = keyof typeof t.decisions;
const DECISIONS = {
  influence: [
    "to_review",
    "validated",
    "refused",
    "to_discuss",
    "waiting_info",
  ],
  press: ["to_review", "validated", "refused", "to_fix"],
} as const satisfies Record<string, readonly Decision[]>;

function DecisionForm({
  projectId,
  rowId,
  press,
  decision,
  note,
  onDone,
}: {
  projectId: string;
  rowId: string;
  press: boolean;
  decision: string;
  note: string | null;
  onDone: () => void;
}) {
  const [choice, setChoice] = useState<Decision>(decision as Decision);
  const { pending, error, run } = useWriteSubmit(onDone, t.decided);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const text = String(
          new FormData(event.currentTarget).get("note") ?? "",
        );
        run(() =>
          decideAgencyRow({ projectId, rowId, decision: choice, note: text }),
        );
      }}
    >
      <ChipChoice
        name="decision"
        legend={t.pdsDecision}
        required
        value={choice}
        onChange={(v) => v && setChoice(v)}
        options={DECISIONS[press ? "press" : "influence"].map((d) => ({
          value: d,
          label: t.decisions[d],
        }))}
      />
      <TextareaField
        name="note"
        label={t.note}
        rows={3}
        maxLength={2000}
        defaultValue={note ?? ""}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.decide}
        </Button>
      </div>
    </form>
  );
}

function LinkForm({
  projectId,
  rowId,
  press,
  name,
  onDone,
}: {
  projectId: string;
  rowId: string;
  press: boolean;
  name: string;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const load = usePickerLoad(() =>
    listNetworkForRole(press ? ["media"] : ["influencer"]),
  );
  function submit(event: FormEvent<HTMLFormElement>) {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const contactId = String(
      new FormData(event.currentTarget).get("contactId") ?? "",
    );
    if (!contactId) return setError(fr.activationWork.errors.contactRequired);
    startTransition(async () => {
      const r = await linkAgencyRow({ projectId, rowId, contactId });
      if (!r.ok) return setError(r.error);
      toast.success(t.linked);
      onDone();
    });
  }
  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={submit}>
      <PersonPickerField<RankedPerson>
        refName="contactId"
        nameName="contactName"
        legend={fr.activationWork.targets.contact}
        load={load}
        defaultRef={null}
        defaultName={name}
        createRoles={press ? ["media"] : ["influencer"]}
        createKind={press ? "organization" : "person"}
        refOfContact={(id) => id}
        allowNameOnly={false}
        suggest={(o) => o.group !== "network"}
        required
        error={error ?? undefined}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.link}
        </Button>
      </div>
    </form>
  );
}

/** « Décider » and « Rattacher au Réseau » on one agency row. */
export function RowButtons(props: {
  projectId: string;
  rowId: string;
  press: boolean;
  decision: string;
  note: string | null;
  name: string;
  linked: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <DialogButton
        label={t.decide}
        size="xs"
        variant="default"
        title={t.decideTitle}
        description={t.decideDescription}
      >
        {(close) => <DecisionForm {...props} onDone={close} />}
      </DialogButton>
      {!props.linked && (
        <DialogButton
          label={t.link}
          size="xs"
          title={t.linkTitle}
          description={t.linkDescription}
        >
          {(close) => <LinkForm {...props} onDone={close} />}
        </DialogButton>
      )}
    </div>
  );
}
