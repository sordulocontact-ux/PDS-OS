"use client";

import Link from "next/link";
import { useState } from "react";

import { ProjectContractsToCreate } from "@/components/contracts/project-contracts-to-create";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { Loaded } from "@/components/ui/loaded";
import { routes } from "@/lib/auth/redirects";
import { contracts } from "@/lib/i18n/fr/contracts";
import { loadProjectContracts } from "@/lib/legal/contracts/project-contracts";

const fr = { contracts };

/**
 * « Partir d'un modèle » (Sacha 26/11/2026): the project (already known
 * from its Juridique), then the people who still need a contract, each
 * with its template and « Créer le contrat »; without a fitting template,
 * « + Nouveau modèle de contrat » from the menu, asked of the direction and
 * taken for that person once validated.
 */
export function ProjectContractsPick({
  projects,
  projectId: fixed,
  onCreated,
}: {
  projects: Array<{ id: string; title: string }>;
  projectId?: string;
  // A contract made: the modal closes on its page.
  onCreated: (contractId: string) => void;
}) {
  const t = fr.contracts.creation;
  const [projectId, setProjectId] = useState<string | null>(fixed ?? null);
  // Bumped after a change: the rows are read again.
  const [round, setRound] = useState(0);

  return (
    <div className="flex flex-col gap-5">
      {!fixed && (
        <OptionSelect
          name="contractProject"
          label={t.project}
          placeholder={t.projectPlaceholder}
          items={Object.fromEntries(projects.map((p) => [p.id, p.title]))}
          defaultValue={projectId}
          onValueChange={setProjectId}
        />
      )}
      {projectId && (
        <Loaded
          key={`${projectId}-${round}`}
          load={() => loadProjectContracts(projectId)}
          loadingLabel={t.loading}
          errorLabel={t.loadFailed}
        >
          {(data) =>
            data.state === "ready" ? (
              <ProjectContractsToCreate
                projectId={projectId}
                rows={data.rows}
                organizationId={data.organizationId}
                requests={data.requests}
                direction={data.direction}
                onChange={() => setRound((r) => r + 1)}
                onCreated={onCreated}
              />
            ) : (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-muted-foreground">
                  {data.state === "unplanned" ? t.unplanned : t.unavailable}
                </p>
                {data.state === "unplanned" && (
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={routes.projectLegal(projectId)} />}
                  >
                    {t.openLegal}
                  </Button>
                )}
              </div>
            )
          }
        </Loaded>
      )}
    </div>
  );
}
