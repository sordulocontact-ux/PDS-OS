import { Field } from "@/components/auth/field";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { centsToInput } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import type { Equipment } from "@/lib/production/preprod/types";
import type { NetworkOption } from "@/lib/production/sheet";

const t = fr.productionPreprod.equipment;

const money = (cents: number | null | undefined) =>
  cents === null || cents === undefined ? "" : centsToInput(cents);

/** The rental part of an equipment line, as a quote states it: supplier
 * (a Réseau contact, else a name), price, deposit, period, return terms. */
export function EquipmentRentalFields({
  id,
  item,
  contacts,
}: {
  id: string;
  item: Equipment | null;
  contacts: NetworkOption[];
}) {
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <OptionSelect
          id={`${id}-supplier`}
          name="supplierContactId"
          label={t.fields.supplier}
          items={{
            none: t.supplierNone,
            ...Object.fromEntries(contacts.map((c) => [c.id, c.name])),
          }}
          defaultValue={item?.supplierContactId ?? "none"}
        />
        <Field
          id={`${id}-supplier-name`}
          name="supplierName"
          label={t.fields.supplierName}
          maxLength={200}
          defaultValue={
            item?.supplierContactId ? "" : (item?.supplierName ?? "")
          }
        />
        <Field
          id={`${id}-price`}
          name="price"
          label={t.fields.price}
          suffix="€"
          inputMode="decimal"
          defaultValue={money(item?.priceCents)}
        />
        <Field
          id={`${id}-deposit`}
          name="deposit"
          label={t.fields.deposit}
          suffix="€"
          inputMode="decimal"
          defaultValue={money(item?.depositCents)}
        />
        <Field
          id={`${id}-start`}
          name="periodStart"
          type="date"
          label={t.fields.periodStart}
          defaultValue={item?.periodStart ?? ""}
        />
        <Field
          id={`${id}-end`}
          name="periodEnd"
          type="date"
          label={t.fields.periodEnd}
          defaultValue={item?.periodEnd ?? ""}
        />
      </div>
      <TextareaField
        id={`${id}-terms`}
        name="returnTerms"
        label={t.fields.returnTerms}
        rows={2}
        maxLength={1000}
        defaultValue={item?.returnTerms ?? ""}
      />
    </>
  );
}
