"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ContractImport } from "@/components/contracts/contract-import";
import { ProjectContractsPick } from "@/components/contracts/project-contracts-pick";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { routes } from "@/lib/auth/redirects";
import type { ContractFormOptions } from "@/lib/contracts/types";
import { contracts } from "@/lib/i18n/fr/contracts";

const fr = { contracts };

type Scenario = "import" | "generate";
export type CreationSize = "default" | "medium" | "document";

/**
 * « Nouveau contrat »: two ways, both done in the modal (JUR-18; Sacha
 * 26/11/2026: « la création d'un contrat est bizarre »), chosen with the
 * sliding segments (« moins de place et plus facile à lire »), the drop
 * first: a contract that already exists, its file dropped and read beside
 * its form; or one made from a template for a person of a project who
 * still needs one. Who cannot prepare a project's contracts (manage_legal)
 * goes straight to the file.
 */
export function ContractCreation({
  options,
  projectId,
  onClose,
  onSize,
}: {
  options: ContractFormOptions;
  projectId?: string;
  onClose: () => void;
  // The modal widens for a project's people, and more for a dropped
  // contract read beside its form.
  onSize?: (size: CreationSize) => void;
}) {
  const t = fr.contracts.creation;
  const router = useRouter();
  const [scenario, setScenario] = useState<Scenario>("import");
  const [dropping, setDropping] = useState(true);
  // Bumped by « Annuler »: the import starts again from its drop zone.
  const [round, setRound] = useState(0);

  useEffect(() => {
    onSize?.(
      scenario === "generate" ? "medium" : !dropping ? "document" : "default",
    );
    return () => onSize?.("default");
  }, [scenario, dropping, onSize]);

  // Once the file is read, the contract and its form take the whole modal.
  const choosing = options.generates && !(scenario === "import" && !dropping);

  return (
    <div className="flex flex-col gap-5">
      {choosing && (
        <SegmentedControl
          fill
          aria-label={t.legend}
          options={[
            { value: "import", label: t.import },
            { value: "generate", label: t.generate },
          ]}
          value={scenario}
          onChange={(next) => next && setScenario(next)}
        />
      )}
      {/* One tree for every case, so the import keeps its file when the
          choice goes away. */}
      {scenario === "import" && (
        <ContractImport
          key={round}
          options={options}
          projectId={projectId}
          onDropped={() => setDropping(false)}
          onCancel={() => {
            if (!options.generates) return onClose();
            setDropping(true);
            setRound((r) => r + 1);
          }}
          onClose={onClose}
        />
      )}
      {scenario === "generate" && (
        <ProjectContractsPick
          projects={options.projects}
          projectId={projectId}
          onCreated={(id) => {
            onClose();
            router.push(routes.contract(id));
          }}
        />
      )}
    </div>
  );
}
