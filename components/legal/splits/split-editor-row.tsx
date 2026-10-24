"use client";

import { IconXmark } from "nucleo-sharp-essential";

import { PersonPickerField } from "@/components/network/person-picker-field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import type { CreatorDraft } from "@/lib/legal/splits/draft";
import type { SplitPersonOption } from "@/lib/legal/splits/party-actions";
import {
  CREATOR_ROLES,
  isCreatorRole,
  type CreatorRole,
} from "@/lib/legal/splits/shares";

/** The option a row starts on: its contact, else the credit it came from. */
const refOf = (row: CreatorDraft) =>
  row.contactId
    ? `contact:${row.contactId}`
    : row.creditId
      ? `credit:${row.creditId}`
      : null;

/** One creator of the work (« Qui a créé quoi », JUR-01): the person,
 * picked (the title's credited creators first, then the Réseau), which
 * fills what they created; or only a name, which keeps no link. No part
 * here: parts are typed further down. */
export function SplitEditorRow({
  row,
  load,
  canRemove,
  errors,
  onPick,
  onChange,
  onRemove,
}: {
  row: CreatorDraft;
  load: (fresh?: boolean) => Promise<SplitPersonOption[]>;
  canRemove: boolean;
  errors: { person?: string; role?: string } | null;
  onPick: (change: Partial<CreatorDraft>) => void;
  onChange: (change: Partial<CreatorDraft>) => void;
  onRemove: () => void;
}) {
  const t = fr.legalSplits.editor;
  const ref = refOf(row);
  return (
    <li className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem_auto] sm:items-start">
      <PersonPickerField<SplitPersonOption>
        refName={`ref-${row.key}`}
        nameName={`name-${row.key}`}
        legend={t.name}
        required
        load={load}
        defaultRef={ref}
        defaultName={ref ? null : row.name || null}
        matchName={false}
        createRoles={["songwriter"]}
        createKind="person"
        refOfContact={(id) => `contact:${id}`}
        onPick={(option, name) =>
          onPick(
            option
              ? {
                  name: option.label,
                  contactId: option.contactId,
                  creditId: option.creditId,
                  role:
                    option.role && isCreatorRole(option.role)
                      ? option.role
                      : row.role,
                }
              : // A name only, or the choice undone: no link is kept.
                { name, contactId: null, creditId: null },
          )
        }
        error={errors?.person}
      />
      <OptionSelect
        // A role filled by the pick shows at once.
        key={row.role ?? "none"}
        name={`role-${row.key}`}
        label={t.role}
        required
        items={Object.fromEntries(
          CREATOR_ROLES.map((r) => [r, fr.legalSplits.roles[r]]),
        )}
        defaultValue={row.role}
        error={errors?.role}
        onValueChange={(value) => onChange({ role: value as CreatorRole })}
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
