"use client";

import { useState } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { PeoplePicker } from "@/components/ui/people-picker";
import { OptionSelect } from "@/components/projects/option-select";
import type { FieldErrors } from "@/lib/auth/form-state";
import { shell } from "@/lib/i18n/fr/shell";
import type { CreativeMember } from "@/lib/projects/creatives";

const fr = { shell };

// "Équipe" of the project form, creation only: the project goes to the
// project manager chosen (the post is known, only the person is asked), and
// the team changes by transmission afterwards. Creative direction optional.
// With a Master (`withMasterValidator`), who validates its versions, among
// the people chosen above, the manager by default (retour d'Ibé, 02/11/2026).
export function ProjectTeamFields({
  managers,
  creatives,
  defaultManagerId,
  defaultCreativeIds,
  withMasterValidator,
  defaultMasterValidatorId,
  errors,
}: {
  managers: CreativeMember[];
  creatives: CreativeMember[];
  defaultManagerId: string | null;
  defaultCreativeIds: string[];
  withMasterValidator: boolean;
  defaultMasterValidatorId: string | null;
  errors: FieldErrors;
}) {
  const t = fr.shell.newProject.fields;
  const [managerId, setManagerId] = useState(defaultManagerId);
  const [creativeIds, setCreativeIds] = useState(defaultCreativeIds);
  const [validatorId, setValidatorId] = useState(defaultMasterValidatorId);
  const managerItems = Object.fromEntries(
    managers.map((person) => [person.personId, person.name]),
  );
  const creativeItems = Object.fromEntries(
    creatives.map((person) => [person.personId, person.name]),
  );
  // The manager first, then the creative directors in the order picked.
  const validatorItems: Record<string, string> = {};
  if (managerId && managerItems[managerId])
    validatorItems[managerId] = managerItems[managerId];
  for (const id of creativeIds)
    if (creativeItems[id] && !validatorItems[id])
      validatorItems[id] = creativeItems[id];
  // A person no longer chosen above gives way to the manager.
  const validator =
    validatorId && validatorItems[validatorId] ? validatorId : managerId;

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
          onValueChange={setManagerId}
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
        onChange={setCreativeIds}
        error={errors.creativePersonIds}
      />
      {withMasterValidator && (
        <OptionSelect
          name="masterValidatorPersonId"
          label={t.masterValidator}
          hint={t.masterValidatorHint}
          placeholder={t.masterValidatorPlaceholder}
          items={validatorItems}
          defaultValue={validator}
          onValueChange={setValidatorId}
          error={errors.masterValidatorPersonId}
        />
      )}
    </>
  );
}
