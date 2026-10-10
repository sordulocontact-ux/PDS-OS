"use client";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { DialogFormActions } from "@/components/production/prep/need-dialog-actions";
import { usePrepSubmit } from "@/components/production/prep/use-prep-submit";
import { OptionSelect } from "@/components/projects/option-select";
import { ToneCallout } from "@/components/ui/tone-callout";
import type { Member } from "@/lib/framing/related";
import { fr } from "@/lib/i18n/fr";
import {
  addEquipment,
  updateEquipment,
} from "@/lib/production/preprod/actions-equipment";
import { EQUIPMENT_FORM_STATUSES } from "@/lib/production/preprod/equipment";
import {
  EQUIPMENT_CATEGORIES,
  equipmentCategoryOf,
  type Equipment,
} from "@/lib/production/preprod/types";
import type { NetworkOption } from "@/lib/production/sheet";

import { EquipmentRentalFields } from "./equipment-rental-fields";
import { holderItems, holderValue } from "./holder-items";

const t = fr.productionPreprod.equipment;

/**
 * « Ajouter un article » / « Saisir depuis ce devis » / « Modifier »: what
 * the quote says or what is needed. A line read from a quote starts « À
 * vérifier » and keeps that state until « Marquer vérifiée »; its state
 * otherwise is the person's choice — nothing is booked by being listed.
 */
export function EquipmentForm({
  projectId,
  sheetId,
  item,
  quoteFileId,
  members,
  contacts,
  onDone,
}: {
  projectId: string;
  sheetId: string;
  item: Equipment | null;
  // Set when the line is read from a quote or capture.
  quoteFileId: string | null;
  members: Member[];
  contacts: NetworkOption[];
  onDone: () => void;
}) {
  const { pending, error, run } = usePrepSubmit(
    onDone,
    item ? t.updated : t.added,
  );
  const toVerify = quoteFileId !== null || item?.status === "to_verify";
  const id = item ? `equipment-${item.id}` : "equipment-new";

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = (key: string) => String(data.get(key) ?? "");
        const values = {
          projectId,
          category: equipmentCategoryOf(data.get("category")),
          label: text("label"),
          quantity: text("quantity"),
          supplierContactId: text("supplierContactId"),
          supplierName: text("supplierName"),
          price: text("price"),
          periodStart: text("periodStart"),
          periodEnd: text("periodEnd"),
          deposit: text("deposit"),
          returnTerms: text("returnTerms"),
          status: text("status") || "need",
          returnHolder: text("returnHolder"),
          returnDue: text("returnDue"),
          incidentNote: text("incidentNote"),
          note: text("note"),
          quoteFileId: quoteFileId ?? undefined,
        };
        run(() =>
          item
            ? updateEquipment({ ...values, equipmentId: item.id })
            : addEquipment({ ...values, sheetId }),
        );
      }}
    >
      {toVerify && <ToneCallout tone="warning">{t.fromQuoteNote}</ToneCallout>}
      <div className="grid gap-5 sm:grid-cols-2">
        <OptionSelect
          id={`${id}-category`}
          name="category"
          label={t.fields.category}
          required
          items={Object.fromEntries(
            EQUIPMENT_CATEGORIES.map((c) => [c, t.categories[c]]),
          )}
          defaultValue={item?.category ?? "image"}
        />
        <Field
          id={`${id}-quantity`}
          name="quantity"
          type="number"
          min={1}
          max={1000}
          label={t.fields.quantity}
          defaultValue={item?.quantity ?? ""}
        />
      </div>
      <Field
        id={`${id}-label`}
        name="label"
        label={t.fields.label}
        required
        maxLength={200}
        defaultValue={item?.label ?? ""}
      />
      <EquipmentRentalFields id={id} item={item} contacts={contacts} />
      {!toVerify && (
        <OptionSelect
          id={`${id}-status`}
          name="status"
          label={t.fields.status}
          required
          items={Object.fromEntries(
            EQUIPMENT_FORM_STATUSES.map((s) => [s, t.statuses[s]]),
          )}
          defaultValue={item?.status ?? "need"}
        />
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <OptionSelect
          id={`${id}-return-holder`}
          name="returnHolder"
          label={t.fields.returnHolder}
          items={holderItems(members, contacts)}
          defaultValue={holderValue(item?.returnHolder ?? null)}
        />
        <Field
          id={`${id}-return-due`}
          name="returnDue"
          type="date"
          label={t.fields.returnDue}
          defaultValue={item?.returnDue ?? ""}
        />
      </div>
      <TextareaField
        id={`${id}-incident`}
        name="incidentNote"
        label={t.fields.incident}
        rows={2}
        maxLength={1000}
        defaultValue={item?.incidentNote ?? ""}
      />
      <TextareaField
        id={`${id}-note`}
        name="note"
        label={t.fields.note}
        rows={2}
        maxLength={1000}
        defaultValue={item?.note ?? ""}
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
