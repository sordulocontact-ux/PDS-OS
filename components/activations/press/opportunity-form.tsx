"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { MESSAGE_CHANNELS } from "@/lib/activations/model";
import { saveOpportunity } from "@/lib/activations/press/opportunity-actions";
import type { OpportunityRecord } from "@/lib/activations/press/queries";
import { toParisLocalInput } from "@/lib/calls/format";
import type { Member } from "@/lib/framing/related";
import { activationPress } from "@/lib/i18n/fr/activation-press";
import { activationWork } from "@/lib/i18n/fr/activation-work";
import { activations } from "@/lib/i18n/fr/activations";

import { MemberSelect, memberValue } from "../member-select";

const fr = { activations, activationWork, activationPress };

const t = fr.activationPress.opportunities;
const TYPES = Object.keys(t.types) as (keyof typeof t.types)[];
const STATUSES = Object.keys(t.statuses) as (keyof typeof t.statuses)[];
const SLOTTED = ["confirmed", "done", "broadcast_declared", "no_broadcast"];

/** An opportunity created or updated : type, state, slot (Paris time), who
 * confirmed what by which channel, with its proof. */
export function OpportunityForm({
  projectId,
  activationId,
  targetId,
  opportunity: o,
  members,
  onDone,
}: {
  projectId: string;
  activationId: string;
  targetId: string;
  opportunity: OpportunityRecord | null;
  members: Member[];
  onDone: () => void;
}) {
  const [status, setStatus] = useState<string>(o?.status ?? "proposed");
  const { pending, error, run } = useWriteSubmit(onDone, t.saved);
  const slotted = SLOTTED.includes(status);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = (k: string) => String(data.get(k) ?? "");
        run(() =>
          saveOpportunity({
            projectId,
            activationId,
            targetId,
            opportunityId: o?.id ?? null,
            type: text("type") as (typeof TYPES)[number],
            status: status as (typeof STATUSES)[number],
            format: text("format"),
            subject: text("subject"),
            scheduledAt: text("scheduledAt"),
            location: text("location"),
            participants: text("participants"),
            pdsPersonId: memberValue(data, "pdsPerson"),
            constraints: text("constraints"),
            confirmedByName: text("confirmedBy"),
            confirmationChannel: text("channel") as "email" | "",
            confirmationProofUrl: text("proof").trim(),
            statusNote: text("statusNote"),
          }),
        );
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <OptionSelect
          name="type"
          label={t.type}
          required
          items={Object.fromEntries(TYPES.map((k) => [k, t.types[k]]))}
          defaultValue={o?.type ?? "interview"}
        />
        <OptionSelect
          name="status"
          label={t.status}
          required
          items={Object.fromEntries(STATUSES.map((k) => [k, t.statuses[k]]))}
          defaultValue={status}
          onValueChange={setStatus}
        />
      </div>
      <Field
        name="subject"
        label={t.subject}
        maxLength={500}
        defaultValue={o?.subject ?? ""}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="format"
          label={t.format}
          maxLength={120}
          defaultValue={o?.format ?? ""}
        />
        <Field
          name="scheduledAt"
          type="datetime-local"
          label={t.scheduledAt}
          required={slotted}
          defaultValue={
            o?.scheduledAt ? toParisLocalInput(new Date(o.scheduledAt)) : ""
          }
        />
      </div>
      <Field
        name="location"
        label={t.location}
        maxLength={500}
        defaultValue={o?.location ?? ""}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="participants"
          label={t.participants}
          maxLength={500}
          defaultValue={o?.participants ?? ""}
        />
        <MemberSelect
          name="pdsPerson"
          label={t.pdsPerson}
          members={members}
          noneLabel={fr.activations.noOwner}
          defaultValue={o?.pdsPersonId ?? null}
        />
      </div>
      <TextareaField
        name="constraints"
        label={t.constraints}
        rows={2}
        maxLength={1000}
        defaultValue={o?.constraints ?? ""}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          name="confirmedBy"
          label={t.confirmedBy}
          required={slotted}
          maxLength={200}
          defaultValue={o?.confirmedByName ?? ""}
        />
        <OptionSelect
          name="channel"
          label={t.confirmationChannel}
          required={slotted}
          items={Object.fromEntries(
            MESSAGE_CHANNELS.map((c) => [
              c,
              fr.activationWork.messages.channels[c],
            ]),
          )}
          defaultValue={o?.confirmationChannel ?? null}
        />
      </div>
      <Field
        name="proof"
        type="url"
        label={t.confirmationProof}
        placeholder="https://"
        maxLength={2000}
        defaultValue={o?.confirmationProofUrl ?? ""}
      />
      <Field
        name="statusNote"
        label={t.statusNote}
        maxLength={1000}
        defaultValue={o?.statusNote ?? ""}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : o ? t.edit : t.add}
        </Button>
      </div>
    </form>
  );
}
