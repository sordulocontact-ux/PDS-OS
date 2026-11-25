"use client";

import Link from "next/link";
import { useState } from "react";

import { ContractForm } from "@/components/contracts/contract-form";
import { TemplateForm } from "@/components/contracts/templates/template-form";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { toast } from "@/components/ui/toast";
import { routes } from "@/lib/auth/redirects";
import type { ContractFormOptions } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";
import { legalContracts } from "@/lib/i18n/fr/legal-contracts";

const fr = { contracts, legalContracts };

type Scenario = "import" | "generate" | "template";

/**
 * « Nouveau contrat » asks first what is being made (JUR-18): a contract
 * that already exists (recorded here, its parties and its file added on
 * its page, as the steps say), one generated from a template (done from
 * the project's Juridique, where its values are read), or a reusable
 * template, written right here (Sacha 25/11/2026: not sent to the templates
 * page), then added to Contrats › Modèles, to be validated.
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

  if (scenario === "template" && options.templateOrganizationId)
    return (
      <TemplateForm
        organizationId={options.templateOrganizationId}
        onCancel={() => setScenario(null)}
        onDone={() => {
          toast.success(fr.legalContracts.templates.saved);
          onClose();
        }}
      />
    );

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
          ...(options.templateOrganizationId
            ? [
                {
                  value: "template" as const,
                  label: t.template,
                  hint: t.templateHint,
                },
              ]
            : []),
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
    </div>
  );
}
