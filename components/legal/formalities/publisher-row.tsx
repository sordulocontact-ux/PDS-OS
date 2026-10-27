"use client";

import { IconXmark } from "nucleo-sharp-essential";

import { Field } from "@/components/auth/field";
import { FieldError } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Checkbox } from "@/components/ui/checkbox";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { Button } from "@/components/ui/button";
import { contracts } from "@/lib/i18n/fr/contracts";
import { legalFormalities } from "@/lib/i18n/fr/legal-formalities";
import type { Publisher } from "@/lib/legal/formalities/definition";
import type {
  PublisherOption,
  PublishingContractOption,
} from "@/lib/legal/formalities/party-actions";

const fr = { contracts, legalFormalities };

// « À obtenir »: no contract chosen yet (JUR-25).
const TO_OBTAIN = "to_obtain";

/** One publisher of the bulletin: a structure picked in the Réseau (the
 * title's publishing split first), which fills its name and IPI; the
 * creators it publishes (JUR-22) and the contract that founds the link, or
 * « à obtenir » (JUR-25). */
export function PublisherRow({
  rowId,
  publisher,
  load,
  disabled,
  onChange,
  onRemove,
  errors,
  creators,
  contracts,
}: {
  rowId: string;
  // The bulletin's creators by position (1 to 5), named.
  creators: Array<{ position: number; name: string }>;
  contracts: PublishingContractOption[];
  publisher: Publisher;
  load: (fresh?: boolean) => Promise<PublisherOption[]>;
  disabled: boolean;
  onChange: (change: Partial<Publisher>) => void;
  onRemove: () => void;
  errors?: { name?: string; link?: string };
}) {
  const t = fr.legalFormalities.publisher;
  return (
    <div className="grid gap-3 rounded-xl border p-3 sm:grid-cols-3">
      <fieldset disabled={disabled} className="contents">
        <div className="sm:col-span-3">
          <PersonPickerField<PublisherOption>
            refName={`p-ref-${rowId}`}
            nameName={`p-picked-${rowId}`}
            legend={t.person}
            load={load}
            defaultRef={publisher.contact_id ?? null}
            defaultName={null}
            createRoles={["other"]}
            createKind="organization"
            refOfContact={(id) => id}
            onPick={(option, name) =>
              onChange(
                option
                  ? { ...option.fill, contact_id: option.id }
                  : { name, ipi: "", contact_id: undefined },
              )
            }
          />
        </div>
      </fieldset>
      <Field
        name={`p-name-${rowId}`}
        label={t.name}
        hint={t.nameHint}
        value={publisher.name}
        disabled={disabled}
        error={errors?.name}
        onChange={(e) => onChange({ name: e.target.value })}
      />
      <Field
        name={`p-ipi-${rowId}`}
        label={t.ipi}
        value={publisher.ipi}
        disabled={disabled}
        onChange={(e) => onChange({ ipi: e.target.value })}
      />
      <fieldset
        disabled={disabled}
        className="flex flex-col gap-2 sm:col-span-3"
        aria-describedby={errors?.link ? `${rowId}-link-error` : undefined}
      >
        <legend className="mb-1 text-sm font-medium">{t.represents}</legend>
        {creators.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noCreator}</p>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {creators.map((c) => (
              <label
                key={c.position}
                className="flex items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={(publisher.represents ?? []).includes(c.position)}
                  onChange={(e) =>
                    onChange({
                      represents: e.target.checked
                        ? [...(publisher.represents ?? []), c.position].sort()
                        : (publisher.represents ?? []).filter(
                            (p) => p !== c.position,
                          ),
                    })
                  }
                />
                {c.name || t.creatorAt(c.position)}
              </label>
            ))}
          </div>
        )}
        <FieldError id={`${rowId}-link-error`}>{errors?.link}</FieldError>
      </fieldset>
      <fieldset disabled={disabled} className="contents">
        <div className="sm:col-span-3">
          <OptionSelect
            name={`p-contract-${rowId}`}
            label={t.contract}
            hint={t.contractHint}
            items={{
              [TO_OBTAIN]: t.toObtain,
              ...Object.fromEntries(
                contracts.map((c) => [
                  c.id,
                  `${c.title} · ${fr.contracts.states[c.status as keyof typeof fr.contracts.states] ?? c.status}`,
                ]),
              ),
            }}
            defaultValue={publisher.contract_id ?? TO_OBTAIN}
            onValueChange={(v) =>
              onChange({ contract_id: v === TO_OBTAIN ? undefined : v })
            }
          />
        </div>
      </fieldset>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <Field
            name={`p-phono-${rowId}`}
            label={t.phono}
            hint={t.phonoHint}
            inputMode="decimal"
            suffix="%"
            value={publisher.phono.replace(".", ",")}
            disabled={disabled}
            onChange={(e) =>
              onChange({ phono: e.target.value.replace(",", ".") })
            }
          />
        </div>
        {!disabled && (
          <Button
            size="icon"
            variant="ghost"
            aria-label={fr.legalFormalities.creator.remove}
            onClick={onRemove}
          >
            <IconXmark aria-hidden />
          </Button>
        )}
      </div>
    </div>
  );
}
