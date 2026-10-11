"use client";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useDialogSubmit } from "@/components/ui/use-dialog-submit";
import { fr } from "@/lib/i18n/fr";
import { saveActivation } from "@/lib/marketing/actions/activations";
import {
  ACTIVATION_KINDS,
  ACTIVATION_STATUSES,
  type Activation,
} from "@/lib/marketing/model";
import type { ActivationOption } from "@/lib/marketing/queries";

const t = fr.marketing.activations;
// A select item cannot hold "": nothing chosen is NONE on screen.
const NONE = "none";

export type ActivationFormOptions = {
  members: { personId: string; name: string }[];
  deliverables: ActivationOption[];
  levers: ActivationOption[];
};

/** « Ajouter une activation » / « Modifier »: what it is, where it stands,
 * who holds it, the Strategy commitment it carries out. */
export function ActivationForm({
  projectId,
  activation,
  options,
  onDone,
}: {
  projectId: string;
  activation: Activation | null;
  options: ActivationFormOptions;
  onDone: () => void;
}) {
  const { pending, error, run } = useDialogSubmit(onDone, t.saved);
  const a = activation;
  const sources: Record<string, string> = {
    [NONE]: t.fields.noSource,
    ...Object.fromEntries(
      options.deliverables.map((d) => [
        `deliverable:${d.id}`,
        t.fields.deliverable(d.label),
      ]),
    ),
    ...Object.fromEntries(
      options.levers.map((l) => [`lever:${l.id}`, t.fields.lever(l.label)]),
    ),
  };
  const source = a?.deliverableId
    ? `deliverable:${a.deliverableId}`
    : a?.leverId
      ? `lever:${a.leverId}`
      : NONE;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = (key: string) => String(data.get(key) ?? "");
        const kind =
          ACTIVATION_KINDS.find((k) => k === data.get("kind")) ?? "content";
        const status =
          ACTIVATION_STATUSES.find((s) => s === data.get("status")) ??
          "planned";
        const owner = text("owner");
        const chosen = text("source");
        run(() =>
          saveActivation({
            projectId,
            id: a?.id ?? "",
            title: text("title"),
            kind,
            status,
            ownerPersonId: owner === NONE ? "" : owner,
            source: chosen === NONE ? "" : chosen,
            startsOn: text("startsOn"),
            endsOn: text("endsOn"),
            note: text("note"),
          }),
        );
      }}
    >
      <Field
        id="activation-title"
        name="title"
        label={t.fields.title}
        placeholder={t.fields.titlePlaceholder}
        required
        maxLength={200}
        defaultValue={a?.title ?? ""}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <OptionSelect
          id="activation-kind"
          name="kind"
          label={t.fields.kind}
          required
          items={Object.fromEntries(
            ACTIVATION_KINDS.map((k) => [k, t.kinds[k]]),
          )}
          defaultValue={a?.kind ?? "content"}
        />
        <OptionSelect
          id="activation-status"
          name="status"
          label={t.fields.status}
          required
          items={Object.fromEntries(
            ACTIVATION_STATUSES.map((s) => [s, t.statuses[s]]),
          )}
          defaultValue={a?.status ?? "planned"}
        />
      </div>
      <OptionSelect
        id="activation-owner"
        name="owner"
        label={t.fields.owner}
        items={{
          [NONE]: t.fields.noOwner,
          ...Object.fromEntries(
            options.members.map((m) => [m.personId, m.name]),
          ),
        }}
        defaultValue={a?.ownerPersonId ?? NONE}
      />
      <OptionSelect
        id="activation-source"
        name="source"
        label={t.fields.source}
        items={sources}
        defaultValue={source}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="activation-starts"
          name="startsOn"
          type="date"
          label={t.fields.startsOn}
          defaultValue={a?.startsOn ?? ""}
        />
        <Field
          id="activation-ends"
          name="endsOn"
          type="date"
          label={t.fields.endsOn}
          defaultValue={a?.endsOn ?? ""}
        />
      </div>
      <TextareaField
        id="activation-note"
        name="note"
        label={t.fields.note}
        rows={2}
        maxLength={2000}
        defaultValue={a?.note ?? ""}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={t.save}
        onCancel={onDone}
      />
    </form>
  );
}
