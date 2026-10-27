"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { saveInterviewBrief } from "@/lib/activations/press/opportunity-actions";
import type { OpportunityRecord } from "@/lib/activations/press/queries";
import type { Member } from "@/lib/framing/related";
import { activationPress } from "@/lib/i18n/fr/activation-press";
import { activations } from "@/lib/i18n/fr/activations";

import { OpportunityForm } from "./opportunity-form";

const fr = { activations, activationPress };

const t = fr.activationPress.opportunities;

export function OpportunityButton(props: {
  projectId: string;
  activationId: string;
  targetId: string;
  opportunity: OpportunityRecord | null;
  members: Member[];
}) {
  return (
    <DialogButton
      label={props.opportunity ? t.edit : t.add}
      icon={props.opportunity ? undefined : IconPlus}
      size={props.opportunity ? "xs" : "sm"}
      title={props.opportunity ? t.editTitle : t.addTitle}
      description={t.addDescription}
      wide
    >
      {(close) => <OpportunityForm {...props} onDone={close} />}
    </DialogButton>
  );
}

function BriefForm({
  projectId,
  opportunityId,
  defaultBrief,
  onDone,
}: {
  projectId: string;
  opportunityId: string;
  defaultBrief: string;
  onDone: () => void;
}) {
  const { pending, error, run } = useWriteSubmit(onDone, t.briefSaved);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const brief = String(
          new FormData(event.currentTarget).get("brief") ?? "",
        );
        run(() => saveInterviewBrief({ projectId, opportunityId, brief }));
      }}
    >
      <TextareaField
        name="brief"
        label={t.brief}
        hint={t.briefHint}
        rows={18}
        maxLength={20000}
        defaultValue={defaultBrief}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.briefSave}
        </Button>
      </div>
    </form>
  );
}

/** « Préparer le brief » : the text written by code (or the one saved),
 * edited, then saved. */
export function BriefButton(props: {
  projectId: string;
  opportunityId: string;
  defaultBrief: string;
  saved: boolean;
}) {
  return (
    <DialogButton
      label={props.saved ? t.brief : t.briefPrepare}
      size="xs"
      variant="outline"
      title={t.brief}
      description={t.briefHint}
      wide
    >
      {(close) => <BriefForm {...props} onDone={close} />}
    </DialogButton>
  );
}
