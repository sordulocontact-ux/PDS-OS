"use client";

import { useState } from "react";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { ObjectiveForm } from "@/components/strategy/objective-form";
import { optionClass } from "@/components/strategy/option-class";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import {
  addObjective,
  removeObjective,
  updateObjective,
} from "@/lib/strategy/actions/objectives";
import type { StrategyObjective } from "@/lib/strategy/queries";

const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const dueFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** « Objectifs & KPIs »: what is measured and the figure to reach. */
export function ObjectivesSection({
  objectives,
  projectId,
}: {
  objectives: StrategyObjective[];
  projectId: string;
}) {
  const t = fr.strategyPilot.objectives;
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();
  const [editing, setEditing] = useState<string | null>(null);
  // Bumped once a new objective is saved: its form starts empty again.
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="flex flex-col gap-6">
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
                    label: o.label,
                    target:
                      o.target === null
                        ? ""
                        : String(o.target).replace(".", ","),
                    unit: o.unit ?? "",
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
              <li
                key={o.id}
                className={`${optionClass(false)} justify-between`}
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="font-semibold break-words">{o.label}</span>
                  <span className="text-caption text-muted-foreground tabular-nums">
                    {[
                      o.target === null
                        ? t.noTarget
                        : [number.format(o.target), o.unit]
                            .filter(Boolean)
                            .join(" "),
                      o.due_on
                        ? dueFormat.format(new Date(`${o.due_on}T00:00:00Z`))
                        : t.noDueOn,
                    ].join(" · ")}
                  </span>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      aria-label={t.editLabel(o.label)}
                      onClick={() => setEditing(o.id)}
                    >
                      {t.edit}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      aria-label={t.removeLabel(o.label)}
                      onClick={() =>
                        run(() => removeObjective(projectId, o.id))
                      }
                    >
                      {t.remove}
                    </Button>
                  </div>
                )}
              </li>
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
    </div>
  );
}
