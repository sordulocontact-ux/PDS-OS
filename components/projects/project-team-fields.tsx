"use client";

import { FormMessage } from "@/components/auth/form-message";
import { PeoplePicker } from "@/components/ui/people-picker";
import { OptionSelect } from "@/components/projects/option-select";
import type { FieldErrors } from "@/lib/auth/form-state";
import { fr } from "@/lib/i18n/fr";
import type { CreativeMember } from "@/lib/projects/creatives";

// "Équipe" of the project form, creation only: the project goes to the
// project manager chosen (the post is known, only the person is asked), and
// the team changes by transmission afterwards. Creative direction optional.
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
    <>
      {managers.length === 0 ? (
        <FormMessage kind="error">{t.managerNone}</FormMessage>
      ) : (
        <OptionSelect
          name="assigneePersonId"
          label={t.manager}
          hint={t.managerHint}
          required
          placeholder={t.managerPlaceholder}
          items={managerItems}
          defaultValue={defaultManagerId}
          error={errors.assigneePersonId}
        />
      )}
      <PeoplePicker
        name="creativePersonIds"
        label={t.creatives}
        emptyLabel={t.creativesNone}
        candidates={creatives}
        hint={t.creativesHint}
        summary={t.creativesSelected}
        defaultSelectedIds={defaultCreativeIds}
        error={errors.creativePersonIds}
      />
    </>
  );
}
