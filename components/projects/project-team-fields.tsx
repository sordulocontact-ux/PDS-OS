"use client";

import { FormMessage } from "@/components/auth/form-message";
import { CreativePicker } from "@/components/projects/creative-picker";
import { OptionSelect } from "@/components/projects/option-select";
import type { FieldErrors } from "@/lib/auth/form-state";
import { fr } from "@/lib/i18n/fr";
import type { CreativeMember } from "@/lib/projects/creatives";

// "Équipe" of the project form, creation only: the project goes to its
// manager at creation, and the team changes by transmission afterwards.
export function ProjectTeamFields({
  managers,
  creatives,
  defaultManagerId,
  defaultCreativeIds,
  errors,
}: {
  managers: CreativeMember[];
  creatives: CreativeMember[];
  defaultManagerId: string | null;
  defaultCreativeIds: string[];
  errors: FieldErrors;
}) {
  const t = fr.shell.newProject.fields;
  const managerItems = Object.fromEntries(
    managers.map((person) => [person.personId, person.name]),
  );

  return (
    <fieldset className="flex flex-col gap-5">
      <legend className="mb-3 text-base font-medium">{t.team}</legend>
      {managers.length === 0 ? (
        <FormMessage kind="error">{t.managerNone}</FormMessage>
      ) : (
        <OptionSelect
          name="assigneePersonId"
          label={t.manager}
          placeholder={t.managerPlaceholder}
          hint={t.managerHint}
          items={managerItems}
          defaultValue={defaultManagerId}
          error={errors.assigneePersonId}
        />
      )}
      <CreativePicker
        name="creativePersonIds"
        label={t.creatives}
        hint={t.creativesHint}
        emptyLabel={t.creativesNone}
        candidates={creatives}
        defaultSelectedIds={defaultCreativeIds}
        error={errors.creativePersonIds}
      />
    </fieldset>
  );
}
