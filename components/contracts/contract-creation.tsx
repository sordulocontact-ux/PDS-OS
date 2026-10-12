"use client";

import Link from "next/link";
import { useState } from "react";

import { ContractForm } from "@/components/contracts/contract-form";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { routes } from "@/lib/auth/redirects";
import type { ContractFormOptions } from "@/lib/contracts/types";
import { fr } from "@/lib/i18n/fr";

type Scenario = "import" | "generate" | "template";

/**
 * « Nouveau contrat » asks first what is being made (JUR-18): a contract
 * that already exists (recorded here, its parties and its file added on
 * its page, as the steps say), one generated from a template (done from
 * the project's Juridique, where its values are read), or a reusable
 * template (the templates library).
 */
export function ContractCreation({
  options,
  projectId,
  onClose,
}: {
  options: ContractFormOptions;
  projectId?: string;
  onClose: () => void;
}) {
  const t = fr.contracts.creation;
  const [scenario, setScenario] = useState<Scenario | null>(null);

  if (scenario === "import")
    return (
      <div className="flex flex-col gap-4">
        <ol className="flex list-decimal flex-col gap-0.5 pl-5 text-sm text-muted-foreground">
          {t.importSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <ContractForm
          options={options}
          initial={projectId ? { projectId } : undefined}
          onCancel={() => setScenario(null)}
          // The server action opens the new page itself.
          onSaved={onClose}
        />
      </div>
    );

  return (
    <div className="flex flex-col gap-5">
      <ChoiceCards
        name="contract-scenario"
        legend={t.legend}
        value={scenario}
        onChange={setScenario}
        choices={[
          { value: "import", label: t.import, hint: t.importHint },
          { value: "generate", label: t.generate, hint: t.generateHint },
          { value: "template", label: t.template, hint: t.templateHint },
        ]}
      />
      {scenario === "generate" && (
        <Button
          size="lg"
          className="self-end"
          nativeButton={false}
          render={
            <Link
              href={
                projectId
                  ? routes.projectLegalStep(projectId, "contracts")
                  : routes.projects
              }
            />
          }
        >
          {projectId ? t.openProjectContracts : t.chooseProject}
        </Button>
      )}
      {scenario === "template" && (
        <Button
          size="lg"
          className="self-end"
          nativeButton={false}
          render={<Link href={routes.contractTemplates} />}
        >
          {t.openTemplates}
        </Button>
      )}
    </div>
  );
}
