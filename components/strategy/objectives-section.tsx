"use client";

import { useState } from "react";

import { BriefFieldCard } from "@/components/framing/brief-field-card";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { KpiItem } from "@/components/strategy/kpi-item";
import { ObjectiveForm } from "@/components/strategy/objective-form";
import { labelClass } from "@/components/ui/option-class";
import type { FieldState } from "@/lib/framing/brief";
import { strategyKpis } from "@/lib/i18n/fr/strategy-kpis";
import {
  addObjective,
  removeObjective,
  updateObjective,
} from "@/lib/strategy/actions/objectives";
import { Button } from "@/components/ui/button";
import { saveField } from "@/lib/framing/actions/brief";
import { STRATEGIC_OBJECTIVE } from "@/lib/framing/brief";
import type { Member } from "@/lib/framing/related";
import type { ObjectiveInput } from "@/lib/strategy/actions/objectives";
import {
  isKpiKind,
  isKpiMetric,
  kpiFromFraming,
  type KpiActual,
} from "@/lib/strategy/kpis";
import type {
  FramingObjective,
  StrategyObjective,
} from "@/lib/strategy/queries";

const fr = { strategyKpis };

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
  members,
  framingObjective,
  referenceDate,
}: {
  strategicObjective: FieldState;
  objectives: StrategyObjective[];
  members: Member[];
  // MKT-S1-13: what the Cadrage already said, proposed instead of retyped.
  framingObjective: FramingObjective;
  referenceDate: string | null;
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
  // The Cadrage's measurable objective, loaded into the new KPI's form.
  const [prefill, setPrefill] = useState<ObjectiveInput | undefined>();
  const nameOf = (personId: string | null) =>
    members.find((m) => m.personId === personId)?.name ?? null;
  // The Cadrage's measures not yet a KPI (same figure), each one offered.
  const fromCadrage = framingObjective.measures.filter(
    (m) => !objectives.some((o) => o.target === m.target),
  );
  const number = new Intl.NumberFormat("fr-FR");

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
        {canEdit && !strategicObjective.value && framingObjective.text && (
          <p className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--text-secondary)]">
            {t.fromFraming.objective(framingObjective.text)}
            <Button
              size="xs"
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(() =>
                  saveField(
                    projectId,
                    "strategy",
                    STRATEGIC_OBJECTIVE,
                    framingObjective.text ?? "",
                  ),
                )
              }
            >
              {t.fromFraming.useObjective}
            </Button>
          </p>
        )}
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
                      metric: isKpiMetric(o.metric) ? o.metric : "other",
                      source: o.source === "deezer_fans" ? o.source : "manual",
                      dueOn: o.due_on ?? "",
                      ownerPersonId: o.owner_person_id ?? "",
                    }}
                    members={members}
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
                  ownerName={nameOf(o.owner_person_id)}
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
        {canEdit &&
          editing === null &&
          !prefill &&
          fromCadrage.map((m) => (
            <p
              key={`${m.target}-${m.metric}-${m.period}`}
              className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--text-secondary)]"
            >
              {t.fromFraming.kpi(
                `${number.format(m.target)} ${m.metric} · ${m.period}`,
              )}
              <Button
                size="xs"
                variant="outline"
                onClick={() => {
                  setPrefill(kpiFromFraming(m, referenceDate));
                  setFormKey((k) => k + 1);
                }}
              >
                {t.fromFraming.useKpi}
              </Button>
            </p>
          ))}
        {canEdit && editing === null && (
          <ObjectiveForm
            key={formKey}
            initial={prefill}
            members={members}
            idPrefix="objective-new"
            pending={pending}
            submitLabel={t.add}
            onSubmit={(input) =>
              run(
                () => addObjective(projectId, input),
                () => {
                  setPrefill(undefined);
                  setFormKey((k) => k + 1);
                },
              )
            }
          />
        )}
      </section>
    </div>
  );
}
