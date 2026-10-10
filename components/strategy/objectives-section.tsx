"use client";

import { useState } from "react";

import { BriefFieldCard } from "@/components/framing/brief-field-card";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { KpiItem } from "@/components/strategy/kpi-item";
import { ObjectiveForm } from "@/components/strategy/objective-form";
import { labelClass } from "@/components/strategy/option-class";
import type { FieldState } from "@/lib/framing/brief";
import { fr } from "@/lib/i18n/fr";
import {
  addObjective,
  removeObjective,
  updateObjective,
} from "@/lib/strategy/actions/objectives";
import { isKpiKind, type KpiActual } from "@/lib/strategy/kpis";
import type { StrategyObjective } from "@/lib/strategy/queries";

/**
 * « Objectifs & KPIs » (ticket Stratégie § 7): the strategic objective in
 * the team's words, then a few KPIs, quantitative or qualitative. A
 * measured KPI shows the real value read by code after the release; no
 * dashboard, no figure ever made up.
 */
export function ObjectivesSection({
  strategicObjective,
  objectives,
  actuals,
  projectId,
}: {
  strategicObjective: FieldState;
  objectives: StrategyObjective[];
  // Real values of the measured KPIs, by id (lib/strategy/kpi-actuals.ts).
  actuals: Record<string, KpiActual>;
  projectId: string;
}) {
  const t = fr.strategyKpis;
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();
  const [editing, setEditing] = useState<string | null>(null);
  // Bumped once a new KPI is saved: its form starts empty again.
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <BriefFieldCard
          key={`${strategicObjective.value ?? ""}-${strategicObjective.status ?? ""}`}
          field={strategicObjective}
          label={t.objectiveLabel}
          projectId={projectId}
        />
        <p className="text-caption text-muted-foreground">{t.objectiveHint}</p>
      </div>

      <section aria-labelledby="kpis-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 id="kpis-title" className={labelClass}>
            {t.kpisTitle}
          </h3>
          <p className="text-caption text-muted-foreground">{t.kpisHint}</p>
        </div>
        {objectives.length === 0 ? (
          <p className="text-body-md text-muted-foreground">{t.empty}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {objectives.map((o) =>
              editing === o.id ? (
                <li key={o.id}>
                  <ObjectiveForm
                    idPrefix={`objective-${o.id}`}
                    initial={{
                      kind: isKpiKind(o.kind) ? o.kind : "quantitative",
                      label: o.label,
                      target:
                        o.target === null
                          ? ""
                          : String(o.target).replace(".", ","),
                      unit: o.unit ?? "",
                      source: o.source === "deezer_fans" ? o.source : "manual",
                      dueOn: o.due_on ?? "",
                    }}
                    pending={pending}
                    submitLabel={t.save}
                    onSubmit={(input) =>
                      run(
                        () => updateObjective(projectId, o.id, input),
                        () => setEditing(null),
                      )
                    }
                    onCancel={() => setEditing(null)}
                  />
                </li>
              ) : (
                <KpiItem
                  key={o.id}
                  kpi={o}
                  actual={actuals[o.id]}
                  canEdit={canEdit}
                  pending={pending}
                  onEdit={() => setEditing(o.id)}
                  onRemove={() => run(() => removeObjective(projectId, o.id))}
                />
              ),
            )}
          </ul>
        )}
        {canEdit && editing === null && (
          <ObjectiveForm
            key={formKey}
            idPrefix="objective-new"
            pending={pending}
            submitLabel={t.add}
            onSubmit={(input) =>
              run(
                () => addObjective(projectId, input),
                () => setFormKey((k) => k + 1),
              )
            }
          />
        )}
      </section>
    </div>
  );
}
