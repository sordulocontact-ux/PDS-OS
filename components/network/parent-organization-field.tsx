"use client";

import { PersonPickerField } from "@/components/network/person-picker-field";
import { fr } from "@/lib/i18n/fr";
import { loadContactOptions } from "@/lib/network/actions";

type Organization = { id: string; name: string };

/**
 * The organization of the Réseau a person belongs to, searched, or added to
 * the Réseau without leaving the contact form (an organization has no
 * organization itself, so the nested form stops there). Submitted as
 * `parentId`; nothing picked = none.
 */
export function ParentOrganizationField({
  contactId,
  organizations,
  defaultId,
}: {
  // The contact edited: never its own organization.
  contactId?: string;
  organizations: Organization[];
  defaultId: string | null;
}) {
  const t = fr.network.form;
  const options = (list: Organization[]) =>
    list
      .filter((organization) => organization.id !== contactId)
      .map((organization) => ({
        id: organization.id,
        label: organization.name,
      }));

  return (
    <PersonPickerField
      refName="parentId"
      nameName="parentName"
      legend={t.parent}
      // `fresh`: an organization was just added; read the Réseau again.
      load={async (fresh) =>
        options(
          fresh ? (await loadContactOptions()).organizations : organizations,
        )
      }
      defaultRef={defaultId}
      defaultName={null}
      createRoles={[]}
      createKind="organization"
      refOfContact={(id) => id}
      allowNameOnly={false}
    />
  );
}
