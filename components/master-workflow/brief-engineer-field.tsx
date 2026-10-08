"use client";

import { useState } from "react";

import { PersonPickerField } from "@/components/network/person-picker-field";
import { listBriefEngineers } from "@/lib/catalog/master/engineer-actions";
import { fr } from "@/lib/i18n/fr";
import type { RankedPerson } from "@/lib/network/ranked-people";
import type { NetworkEngineer } from "@/lib/master-workflow/types";

/**
 * An engineer of the Brief, picked in the Réseau (Sacha, 07/10/2026): the
 * engineers credited on the project's titles first, then the Réseau's
 * engineers, then the rest; added to the Réseau without leaving the form.
 * The brief stores a contact (master_briefs.*_contact_id, a foreign key to
 * network_contacts): a name alone is not saved, so it asks for the contact.
 * Once chosen, what the Réseau already knows of them (structure, city,
 * coordinates, titles done with PDS) shows under it (ticket § 4).
 */
export function BriefEngineerField({
  name,
  label,
  projectId,
  engineers,
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  projectId: string;
  engineers: NetworkEngineer[];
  defaultValue: string | null;
  error?: string;
}) {
  const t = fr.masterWorkflow.brief;
  const [selected, setSelected] = useState(defaultValue);
  const engineer = engineers.find((row) => row.id === selected);
  return (
    <div className="flex flex-col gap-1.5">
      <PersonPickerField<RankedPerson>
        refName={name}
        nameName={`${name}Name`}
        legend={label}
        load={() => listBriefEngineers(projectId)}
        defaultRef={defaultValue}
        defaultName={null}
        createRoles={["engineer"]}
        refOfContact={(id) => id}
        // The Brief keeps a contact of the Réseau, never a name alone.
        allowNameOnly={false}
        onPick={(option) => setSelected(option?.id ?? null)}
        error={error}
      />
      {engineer ? (
        <p className="text-caption text-[color:var(--text-secondary)]">
          {[
            engineer.structure,
            engineer.city,
            engineer.email ?? engineer.phone,
            engineer.history ?? t.engineerContact.noHistory,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : (
        !selected && (
          <p className="text-caption text-[color:var(--text-secondary)]">
            {t.fields.engineerHint}
          </p>
        )
      )}
    </div>
  );
}
