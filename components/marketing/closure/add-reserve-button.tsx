"use client";

import { IconPlus } from "nucleo-sharp-essential";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useDialogSubmit } from "@/components/ui/use-dialog-submit";
import { fr } from "@/lib/i18n/fr";
import { addReserve } from "@/lib/marketing/closure/reserve-actions";
import { RESERVE_CATEGORIES } from "@/lib/marketing/reports/model";

const t = fr.marketingReview.closure.reserves;
const NONE = "none";

/** « Proposer une réserve »: a limit of the review, to arbitrate later. */
export function AddReserveButton({
  projectId,
  activations,
}: {
  projectId: string;
  activations: { id: string; title: string }[];
}) {
  return (
    <DialogButton
      label={t.add}
      icon={IconPlus}
      title={t.add}
      description={t.addBody}
    >
      {(close) => (
        <AddReserveForm
          projectId={projectId}
          activations={activations}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function AddReserveForm({
  projectId,
  activations,
  onDone,
}: {
  projectId: string;
  activations: { id: string; title: string }[];
  onDone: () => void;
}) {
  const { pending, error, run } = useDialogSubmit(onDone, t.added);
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = (key: string) => String(data.get(key) ?? "");
        const category =
          RESERVE_CATEGORIES.find((c) => c === text("category")) ?? "other";
        run(() =>
          addReserve({
            projectId,
            category,
            description: text("description"),
            activationId: text("activation") === NONE ? "" : text("activation"),
          }),
        );
      }}
    >
      <OptionSelect
        id="reserve-category"
        name="category"
        label={t.category}
        required
        items={Object.fromEntries(
          RESERVE_CATEGORIES.map((c) => [
            c,
            fr.marketingReview.reports.reserveCategories[c],
          ]),
        )}
        defaultValue="other"
      />
      <TextareaField
        id="reserve-description"
        name="description"
        label={t.description}
        required
        rows={3}
        maxLength={1000}
      />
      <OptionSelect
        id="reserve-activation"
        name="activation"
        label={t.activation}
        items={{
          [NONE]: t.noActivation,
          ...Object.fromEntries(activations.map((a) => [a.id, a.title])),
        }}
        defaultValue={NONE}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={t.add}
        onCancel={onDone}
      />
    </form>
  );
}
