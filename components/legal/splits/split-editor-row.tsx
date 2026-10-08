"use client";

import { IconXmark } from "nucleo-sharp-essential";

import { Field } from "@/components/auth/field";
import { PersonPickerField } from "@/components/network/person-picker-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import type { SplitPersonOption } from "@/lib/legal/splits/party-actions";
import { SPLIT_ROLES, type SplitRole } from "@/lib/legal/splits/shares";
import type { NetworkRole } from "@/lib/network/types";

export type SplitRow = {
  key: number;
  name: string;
  role: SplitRole;
  share: string;
  contactId: string | null;
  creditId: string | null;
};

// The role a new contact of the Réseau starts with.
const NETWORK_ROLE: Record<SplitRole, NetworkRole> = {
  author: "songwriter",
  composer: "songwriter",
  arranger: "musician",
  publisher: "other",
  other: "other",
};

/** The option a row starts on: its contact, else the credit it came from. */
const refOf = (row: SplitRow) =>
  row.contactId
    ? `contact:${row.contactId}`
    : row.creditId
      ? `credit:${row.creditId}`
      : null;

/** One line of a split: the person, picked (the title's credited people
 * first, then the Réseau), which fills the role known for them; or only a
 * name, which keeps no link. */
export function SplitEditorRow({
  row,
  load,
  canRemove,
  errors,
  onChange,
  onRemove,
}: {
  row: SplitRow;
  load: (fresh?: boolean) => Promise<SplitPersonOption[]>;
  canRemove: boolean;
  errors: { person?: string; share?: string } | null;
  onChange: (change: Partial<SplitRow>) => void;
  onRemove: () => void;
}) {
  const t = fr.legalSplits.editor;
  const ref = refOf(row);
  return (
    <li className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_8rem_auto] sm:items-start">
      <PersonPickerField<SplitPersonOption>
        refName={`ref-${row.key}`}
        nameName={`name-${row.key}`}
        legend={t.name}
        required
        load={load}
        defaultRef={ref}
        defaultName={ref ? null : row.name || null}
        matchName={false}
        createRoles={[NETWORK_ROLE[row.role]]}
        createKind={row.role === "publisher" ? "organization" : "person"}
        refOfContact={(id) => `contact:${id}`}
        onPick={(option, name) =>
          onChange(
            option
              ? {
                  name: option.label,
                  contactId: option.contactId,
                  creditId: option.creditId,
                  role: option.role ?? row.role,
                }
              : // A name only, or the choice undone: no link is kept.
                { name, contactId: null, creditId: null },
          )
        }
        error={errors?.person}
      />
      <OptionSelect
        name={`role-${row.key}`}
        label={t.role}
        required
        items={Object.fromEntries(
          SPLIT_ROLES.map((r) => [r, fr.legalSplits.roles[r]]),
        )}
        defaultValue={row.role}
        onValueChange={(value) => onChange({ role: value as SplitRole })}
      />
      <Field
        name={`share-${row.key}`}
        label={t.share}
        aria-required
        inputMode="decimal"
        suffix="%"
        value={row.share}
        error={errors?.share}
        onChange={(event) => onChange({ share: event.target.value })}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="sm:mt-6"
        aria-label={t.remove(row.name)}
        disabled={!canRemove}
        onClick={onRemove}
      >
        <IconXmark aria-hidden />
      </Button>
    </li>
  );
}
