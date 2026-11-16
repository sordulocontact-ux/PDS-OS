"use client";

import { useEffect, useState } from "react";

import { Field } from "@/components/auth/field";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { usePickerLoad } from "@/components/network/use-picker-load";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { FormSection } from "@/components/ui/form-section";
import { Label } from "@/components/ui/label";
import { SearchSelect } from "@/components/ui/search-select";
import { loadTaskMembers } from "@/lib/assistant/draft-record-actions";
import { budgetLineTtcCents } from "@/lib/budget/types";
import { VAT_RATES } from "@/lib/finance/money-in";
import { budget } from "@/lib/i18n/fr/budget";
import { clientInvoices } from "@/lib/i18n/fr/client-invoices";
import { listNetworkForRole } from "@/lib/network/role-people-actions";
import { formatAmount } from "@/lib/utils/money";

const fr = { budget, clientInvoices };

// Who usually invoices the label: listed first, the rest of the Réseau after.
const SUPPLIER_ROLES = ["company", "studio", "agency", "other"];

export type SpendDetails = {
  // "" = not given.
  vat: string;
  supplierContactId: string;
  supplierName: string;
  dueOn: string;
  rebillable: boolean;
  validatorId: string;
};

/**
 * What the Finance needs of a spend (Ibé's ticket « Cockpit Finance »,
 * lot 3), on every spend form (project, artist, Finance): its VAT (the
 * amount stays HT, the TTC is said), its supplier, its due day, whether it
 * is rebilled (an expected income is then planned), who validated it.
 */
export function BudgetSpendDetails({
  value,
  amountCents,
  onChange,
}: {
  value: SpendDetails;
  // The HT typed above, to say the TTC.
  amountCents: number | null;
  onChange: (next: SpendDetails) => void;
}) {
  const t = fr.budget.spendDetails;
  const f = fr.clientInvoices.fields;
  const loadSuppliers = usePickerLoad(() => listNetworkForRole(SUPPLIER_ROLES));
  const [members, setMembers] = useState<{ personId: string; name: string }[]>(
    [],
  );
  useEffect(() => {
    let live = true;
    loadTaskMembers()
      .then((list) => live && setMembers(list))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  const vatBp = value.vat === "" ? null : Number(value.vat);
  const ttc =
    amountCents && amountCents > 0 && vatBp
      ? budgetLineTtcCents(amountCents, vatBp)
      : null;
  const set = (patch: Partial<SpendDetails>) =>
    onChange({ ...value, ...patch });

  return (
    <FormSection title={t.title}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="spend-vat">{f.vat}</Label>
          <SearchSelect
            id="spend-vat"
            label={f.vat}
            options={{
              ...Object.fromEntries(
                VAT_RATES.map((bp) => [String(bp), f.vatRate(bp)]),
              ),
              "": f.vatUnknown,
            }}
            value={value.vat}
            onChange={(vat) => set({ vat })}
            searchPlaceholder={t.search}
            emptyLabel={t.noMatch}
            fill
          />
          {ttc !== null && (
            <p className="text-caption text-[color:var(--text-secondary)]">
              {t.ttc(formatAmount(ttc, { ht: false }))}
            </p>
          )}
        </div>
        <Field
          name="spend-due-on"
          type="date"
          label={t.dueOn}
          value={value.dueOn}
          onChange={(e) => set({ dueOn: e.target.value })}
        />
      </div>
      <PersonPickerField
        refName="supplierContactId"
        nameName="supplierName"
        legend={t.supplier}
        load={loadSuppliers}
        defaultRef={value.supplierContactId || null}
        defaultName={
          value.supplierContactId ? null : value.supplierName || null
        }
        createRoles={["company"]}
        createKind="organization"
        refOfContact={(id) => id}
        onPick={(option, name) =>
          set({ supplierContactId: option?.id ?? "", supplierName: name })
        }
      />
      <div className="grid gap-1.5">
        <Label htmlFor="spend-validator">{t.validator}</Label>
        <SearchSelect
          id="spend-validator"
          label={t.validator}
          options={{
            "": t.none,
            ...Object.fromEntries(members.map((m) => [m.personId, m.name])),
          }}
          value={value.validatorId}
          onChange={(validatorId) => set({ validatorId })}
          searchPlaceholder={t.search}
          emptyLabel={t.noMatch}
          fill
        />
      </div>
      <CheckboxField
        name="spend-rebillable"
        label={t.rebillable}
        hint={t.rebillableHint}
        checked={value.rebillable}
        onChange={(rebillable) => set({ rebillable })}
      />
    </FormSection>
  );
}
