"use client";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/projects/option-select";
import { saveContributor } from "@/lib/catalog/master/item-actions";
import type { MasterContributor } from "@/lib/catalog/master/rules";
import { fr } from "@/lib/i18n/fr";

import { MasterForm } from "./master-form";

export function ContributorForm({
  masterId,
  contributor,
  onDone,
}: {
  masterId: string;
  contributor: MasterContributor | null;
  onDone: () => void;
}) {
  const t = fr.masterPage.credits;
  return (
    <MasterForm
      action={saveContributor}
      hidden={{ masterId, itemId: contributor?.id }}
      onDone={onDone}
    >
      {({ value, error }) => (
        <>
          <Field
            name="name"
            label={t.fields.name}
            required
            autoFocus
            autoComplete="off"
            maxLength={200}
            defaultValue={value("name", contributor?.name)}
            error={error("name")}
          />
          <OptionSelect
            name="role"
            label={t.fields.role}
            items={t.roles}
            defaultValue={value("role", contributor?.role ?? "composer")}
            error={error("role")}
          />
          <Field
            name="detail"
            label={t.fields.detail}
            hint={t.fields.detailHint}
            autoComplete="off"
            maxLength={200}
            defaultValue={value("detail", contributor?.detail)}
            error={error("detail")}
          />
        </>
      )}
    </MasterForm>
  );
}
