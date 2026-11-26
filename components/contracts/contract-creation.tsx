"use client";

import { useEffect, useState } from "react";

import { ContractImport } from "@/components/contracts/contract-import";
import { ProjectContractsPick } from "@/components/contracts/project-contracts-pick";
import { ChoiceCards } from "@/components/ui/choice-cards";
import type { ContractFormOptions } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";

const fr = { contracts };

type Scenario = "import" | "generate";

/**
 * « Nouveau contrat » asks first what is being made (JUR-18), and both ways
 * are done in the modal (Sacha 26/11/2026: « la création d'un contrat est
 * bizarre »): a contract that already exists, its file dropped first and
 * the form filled from it; or one generated from a template, from a
 * project's « Contrats à prévoir », where a template is also written for a
 * person who has none. Who cannot prepare a project's contracts
 * (manage_legal) goes straight to the file.
 */
export function ContractCreation({
  options,
  projectId,
  onClose,
  onWide,
}: {
  options: ContractFormOptions;
  projectId?: string;
  onClose: () => void;
  // The project's contracts are a table: the modal widens for them.
  onWide?: (wide: boolean) => void;
}) {
  const t = fr.contracts.creation;
  const [scenario, setScenario] = useState<Scenario | null>(
    options.generates ? null : "import",
  );
  const [dropping, setDropping] = useState(true);

  useEffect(() => {
    onWide?.(scenario === "generate");
    return () => onWide?.(false);
  }, [scenario, onWide]);

  const importing = scenario === "import" && (
    <ContractImport
      options={options}
      projectId={projectId}
      onDropped={() => setDropping(false)}
      onCancel={() => {
        setDropping(true);
        if (options.generates) setScenario(null);
        else onClose();
      }}
      onClose={onClose}
    />
  );
  // The form, once the file is read, takes the whole modal. One tree for
  // every case, so the import keeps its file when the choice goes away.
  const choosing = options.generates && !(scenario === "import" && !dropping);

  return (
    <div className="flex flex-col gap-5">
      {choosing && (
        <ChoiceCards
          name="contract-scenario"
          legend={t.legend}
          value={scenario}
          onChange={setScenario}
          choices={[
            { value: "import", label: t.import, hint: t.importHint },
            { value: "generate", label: t.generate, hint: t.generateHint },
          ]}
        />
      )}
      {importing}
      {scenario === "generate" && (
        <ProjectContractsPick
          projects={options.projects}
          projectId={projectId}
        />
      )}
    </div>
  );
}
