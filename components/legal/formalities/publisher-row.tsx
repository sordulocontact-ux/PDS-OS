"use client";

import { IconXmark } from "nucleo-sharp-essential";

import { Field } from "@/components/auth/field";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import type { Publisher } from "@/lib/legal/formalities/definition";
import type { PublisherOption } from "@/lib/legal/formalities/party-actions";

/** One publisher of the bulletin: a structure picked in the Réseau (the
 * title's publishing split first), which fills its name and IPI. */
export function PublisherRow({
  rowId,
  publisher,
  load,
  disabled,
  onChange,
  onRemove,
}: {
  rowId: string;
  publisher: Publisher;
  load: (fresh?: boolean) => Promise<PublisherOption[]>;
  disabled: boolean;
  onChange: (change: Partial<Publisher>) => void;
  onRemove: () => void;
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
        onChange={(e) => onChange({ name: e.target.value })}
      />
      <Field
        name={`p-ipi-${rowId}`}
        label={t.ipi}
        value={publisher.ipi}
        disabled={disabled}
        onChange={(e) => onChange({ ipi: e.target.value })}
      />
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
