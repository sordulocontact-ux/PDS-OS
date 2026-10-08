"use client";

import { IconXmark } from "nucleo-sharp-essential";

import { Field } from "@/components/auth/field";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { fr } from "@/lib/i18n/fr";
import { QUALITIES, type Creator } from "@/lib/legal/formalities/definition";
import type { CreatorOption } from "@/lib/legal/formalities/party-actions";

const EMPTY_IDENTITY = {
  last_name: "",
  first_name: "",
  pseudonym: "",
  ipi: "",
};

/** One creator of the bulletin: picked in the Réseau (the title's credited
 * people first), which fills their identity, IPI and quality from what PDS
 * OS knows; every value stays correctable. Only the Phono share is typed. */
export function CreatorCard({
  rowId,
  creator,
  load,
  disabled,
  errors,
  onChange,
  onRemove,
}: {
  rowId: string;
  creator: Creator;
  load: (fresh?: boolean) => Promise<CreatorOption[]>;
  disabled: boolean;
  errors?: { last_name?: string; quality?: string };
  onChange: (change: Partial<Creator>) => void;
  onRemove: () => void;
}) {
  const t = fr.legalFormalities.creator;
  return (
    <div className="grid gap-3 rounded-xl border p-3 sm:grid-cols-3">
      <fieldset disabled={disabled} className="contents">
        <div className="sm:col-span-2">
          <PersonPickerField<CreatorOption>
            refName={`c-ref-${rowId}`}
            nameName={`c-name-${rowId}`}
            legend={t.person}
            load={load}
            defaultRef={creator.contact_id ?? null}
            defaultName={null}
            createRoles={["songwriter"]}
            refOfContact={(id) => id}
            onPick={(option, name) =>
              onChange(
                option
                  ? {
                      ...option.fill,
                      quality: option.fill.quality || creator.quality,
                      contact_id: option.id,
                    }
                  : // A name only, or the choice undone: nothing of the
                    // previous person is kept.
                    {
                      ...EMPTY_IDENTITY,
                      last_name: name,
                      contact_id: undefined,
                    },
              )
            }
          />
        </div>
      </fieldset>
      <OptionSelect
        // Remounted when another person is picked (it fills the quality).
        key={`q-${rowId}-${creator.contact_id ?? ""}`}
        name={`c-quality-${rowId}`}
        label={t.quality}
        required
        items={Object.fromEntries(
          QUALITIES.map((q) => [q, fr.legalFormalities.qualities[q]]),
        )}
        defaultValue={creator.quality || null}
        error={errors?.quality}
        onValueChange={(v) => onChange({ quality: v as Creator["quality"] })}
      />
      <Field
        name={`c-last-${rowId}`}
        label={t.lastName}
        aria-required
        value={creator.last_name}
        disabled={disabled}
        error={errors?.last_name}
        onChange={(e) => onChange({ last_name: e.target.value })}
      />
      <Field
        name={`c-first-${rowId}`}
        label={t.firstName}
        value={creator.first_name}
        disabled={disabled}
        onChange={(e) => onChange({ first_name: e.target.value })}
      />
      <Field
        name={`c-pseudo-${rowId}`}
        label={t.pseudonym}
        value={creator.pseudonym}
        disabled={disabled}
        onChange={(e) => onChange({ pseudonym: e.target.value })}
      />
      <Field
        name={`c-ipi-${rowId}`}
        label={t.ipi}
        value={creator.ipi}
        disabled={disabled}
        onChange={(e) => onChange({ ipi: e.target.value })}
      />
      <Field
        name={`c-phono-${rowId}`}
        label={t.phono}
        inputMode="decimal"
        suffix="%"
        value={creator.phono.replace(".", ",")}
        disabled={disabled}
        onChange={(e) => onChange({ phono: e.target.value.replace(",", ".") })}
      />
      <div className="flex items-end justify-between gap-2">
        <label className="flex h-10 items-center gap-2 text-sm">
          <Checkbox
            checked={creator.signs}
            disabled={disabled}
            onChange={(e) => onChange({ signs: e.target.checked })}
          />
          {t.signs}
        </label>
        {!disabled && (
          <Button size="sm" variant="ghost" onClick={onRemove}>
            <IconXmark aria-hidden />
            {t.remove}
          </Button>
        )}
      </div>
    </div>
  );
}
