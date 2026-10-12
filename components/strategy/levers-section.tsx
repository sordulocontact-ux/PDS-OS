"use client";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { LeverForm } from "@/components/strategy/lever-form";
import { LegalDependencies } from "@/components/strategy/legal-dependencies";
import { LeverRow } from "@/components/strategy/lever-row";
import { labelClass } from "@/components/ui/option-class";
import { fr } from "@/lib/i18n/fr";
import {
  addLever,
  leverFromNeed,
  updateLever,
} from "@/lib/strategy/actions/levers";
import type { StrategyData } from "@/lib/strategy/queries";

type Family = keyof typeof fr.framing.needs.families;

/**
 * The Dispositif (ticket Stratégie § 3): the release's levers by family
 * (the same closed taxonomy as needs), each Retenu, À arbitrer or Non
 * retenu. A selected lever carries deliverables; its operational detail is
 * handled later in Activations.
 */
export function LeversSection({
  levers,
  openNeeds,
  legalNeeds,
  legalDependencies,
  projectId,
}: Pick<
  StrategyData,
  "levers" | "openNeeds" | "legalNeeds" | "legalDependencies"
> & { projectId: string }) {
  const t = fr.strategy.levers;
  const d = fr.strategyDispositif;
  const families = fr.framing.needs.families;
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();

  const byFamily = (Object.keys(families) as Family[])
    .map((key) => ({ key, items: levers.filter((l) => l.family === key) }))
    .filter((group) => group.items.length > 0);
  const count = (state: string) =>
    levers.filter((l) => l.state === state).length;

  return (
    <section aria-labelledby="levers-title" className="flex flex-col gap-8">
      {/* Named by the panel title: kept for the section label. */}
      <h3 id="levers-title" className="sr-only">
        {t.title}
      </h3>

      {byFamily.length === 0 ? (
        <p className="text-body-md text-muted-foreground">{t.empty}</p>
      ) : (
        <div className="flex flex-col gap-6">
          <p className="text-caption text-muted-foreground tabular-nums">
            {d.counts(count("selected"), count("to_decide"), count("rejected"))}
          </p>
          {byFamily.map((group) => (
            <div key={group.key} className="flex flex-col gap-3">
              <p className={labelClass}>{families[group.key]}</p>
              <ul className="flex flex-col gap-3">
                {group.items.map((lever) => (
                  <LeverRow
                    key={lever.id}
                    lever={lever}
                    canEdit={canEdit}
                    pending={pending}
                    onPatch={(patch) =>
                      run(() => updateLever(projectId, lever.id, patch))
                    }
                  />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <LeverForm
          levers={levers}
          openNeeds={openNeeds}
          pending={pending}
          onAdd={(label, family, done) =>
            run(() => addLever(projectId, label, family), done)
          }
          onFromNeed={(needId) => run(() => leverFromNeed(projectId, needId))}
        />
      )}

      <LegalDependencies dependencies={legalDependencies} needs={legalNeeds} />

      <p className="text-caption text-muted-foreground">{d.activations}</p>
    </section>
  );
}
