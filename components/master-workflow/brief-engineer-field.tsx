"use client";

import { useState } from "react";

import { OptionSelect } from "@/components/projects/option-select";
import { fr } from "@/lib/i18n/fr";
import type { NetworkEngineer } from "@/lib/master-workflow/types";

const NONE = "none";

/**
 * An engineer of the Brief, chosen among the Réseau's engineers: once
 * chosen, what the Réseau already knows of them (structure, city,
 * coordinates, titles done with PDS) shows under the menu, so nobody asks
 * again (ticket § 4).
 */
export function BriefEngineerField({
  name,
  label,
  engineers,
  defaultValue,
  error,
}: {
  name: string;
  label: string;
  engineers: NetworkEngineer[];
  defaultValue: string | null;
  error?: string;
}) {
  const t = fr.masterWorkflow.brief;
  const [selected, setSelected] = useState(defaultValue ?? NONE);
  const engineer = engineers.find((row) => row.id === selected);
  const items = {
    [NONE]: t.none,
    ...Object.fromEntries(engineers.map((row) => [row.id, row.name])),
  };
  return (
    <div className="flex flex-col gap-1.5">
      <OptionSelect
        name={name}
        label={label}
        items={items}
        defaultValue={defaultValue ?? NONE}
        onValueChange={setSelected}
        hint={engineer ? undefined : t.fields.engineerHint}
        error={error}
      />
      {engineer && (
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
      )}
    </div>
  );
}
