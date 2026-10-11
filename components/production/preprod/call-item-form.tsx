"use client";

import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useDialogSubmit } from "@/components/ui/use-dialog-submit";
import { OptionSelect } from "@/components/projects/option-select";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { fr } from "@/lib/i18n/fr";
import {
  addCallItem,
  updateCallItem,
} from "@/lib/production/preprod/actions-items";
import {
  CALL_ITEM_KINDS,
  callItemKindOf,
  type CallItem,
} from "@/lib/production/preprod/types";

const t = fr.productionPreprod.call;

/** « Noter un point » / « Modifier »: its topic, its nature, its wording. */
export function CallItemForm({
  projectId,
  sheetId,
  item,
  topics,
  onDone,
}: {
  projectId: string;
  // Set to add a point; null when editing `item`.
  sheetId: string | null;
  item: CallItem | null;
  topics: string[];
  onDone: () => void;
}) {
  const { pending, error, run } = useDialogSubmit(
    onDone,
    item ? t.updated : t.added,
  );
  const choices = [...new Set([...topics, ...(item ? [item.topic] : [])])];
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const values = {
          projectId,
          topic: String(data.get("topic") ?? ""),
          kind: callItemKindOf(data.get("kind")),
          body: String(data.get("body") ?? ""),
        };
        run(() =>
          item
            ? updateCallItem({ ...values, itemId: item.id })
            : addCallItem({ ...values, sheetId: sheetId ?? "" }),
        );
      }}
    >
      <OptionSelect
        id="call-item-topic"
        name="topic"
        label={t.topicField}
        required
        items={Object.fromEntries(choices.map((c) => [c, c]))}
        defaultValue={item?.topic ?? choices[0]}
      />
      <ChoiceCards
        name="kind"
        legend={t.kindField}
        required
        defaultValue={item?.kind ?? "decision"}
        choices={CALL_ITEM_KINDS.map((kind) => ({
          value: kind,
          label: t.kinds[kind],
          hint: t.kindHints[kind],
        }))}
      />
      <TextareaField
        id="call-item-body"
        name="body"
        label={t.bodyField}
        required
        rows={3}
        maxLength={2000}
        defaultValue={item?.body ?? ""}
      />
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={fr.productionPreprod.save}
        onCancel={onDone}
      />
    </form>
  );
}
