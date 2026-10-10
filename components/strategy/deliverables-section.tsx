"use client";

import { useState } from "react";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { DeliverableForm } from "@/components/strategy/deliverable-form";
import { DeliverableItem } from "@/components/strategy/deliverable-item";
import { fr } from "@/lib/i18n/fr";
import {
  addDeliverable,
  removeDeliverable,
  updateDeliverable,
} from "@/lib/strategy/actions/deliverables";
import type { StrategyData } from "@/lib/strategy/queries";

/**
 * « Livrables engagés »: what the selected levers commit to produce, grouped
 * by lever. Nature and number are typed by the owner, never preset; once the
 * Stratégie is validated they become the Conception's inputs.
 */
export function DeliverablesSection({
  deliverables,
  levers,
  members,
  projectId,
}: Pick<StrategyData, "deliverables" | "levers" | "members"> & {
  projectId: string;
}) {
  const t = fr.strategy.deliverables;
  const s = fr.strategyDeliverables;
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();
  const [editing, setEditing] = useState<string | null>(null);
  // Bumped once a deliverable is added: its form starts empty again.
  const [formKey, setFormKey] = useState(0);

  const selected = levers.filter(
    (l) => l.state === "selected" && l.review_status === "confirmed",
  );
  const leverOptions = Object.fromEntries(selected.map((l) => [l.id, l.label]));
  const people = Object.fromEntries(members.map((m) => [m.personId, m.name]));
  // Selected levers first, then any other lever still carrying deliverables.
  const groups = [
    ...selected,
    ...levers.filter(
      (l) =>
        !selected.includes(l) && deliverables.some((d) => d.lever_id === l.id),
    ),
  ];

  return (
    <section
      aria-labelledby="deliverables-title"
      className="flex flex-col gap-8"
    >
      {/* Named by the panel title: kept for the section label. */}
      <h3 id="deliverables-title" className="sr-only">
        {t.title}
      </h3>

      {groups.length === 0 ? (
        <p className="text-body-md text-muted-foreground">{t.noLever}</p>
      ) : (
        groups.map((lever) => {
          const own = deliverables.filter((d) => d.lever_id === lever.id);
          return (
            <div key={lever.id} className="flex flex-col gap-3">
              <h4 className="text-body-md font-semibold">{lever.label}</h4>
              {own.length === 0 ? (
                <p className="text-caption text-muted-foreground">
                  {s.noLeverGroup}
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {own.map((d) =>
                    editing === d.id ? (
                      <li key={d.id}>
                        <DeliverableForm
                          idPrefix={`deliverable-${d.id}`}
                          initial={{
                            leverId: d.lever_id,
                            title: d.title,
                            quantity:
                              d.quantity === null ? "" : String(d.quantity),
                            assigneePersonId: d.assignee_person_id ?? "",
                            dueDate: d.due_date ?? "",
                          }}
                          levers={leverOptions}
                          people={people}
                          pending={pending}
                          submitLabel={s.save}
                          onSubmit={(input) =>
                            run(
                              () => updateDeliverable(projectId, d.id, input),
                              () => setEditing(null),
                            )
                          }
                          onCancel={() => setEditing(null)}
                        />
                      </li>
                    ) : (
                      <DeliverableItem
                        key={d.id}
                        deliverable={d}
                        assigneeName={
                          d.assignee_person_id
                            ? (people[d.assignee_person_id] ?? null)
                            : null
                        }
                        canEdit={canEdit}
                        pending={pending}
                        onEdit={() => setEditing(d.id)}
                        onRemove={() =>
                          run(() => removeDeliverable(projectId, d.id))
                        }
                      />
                    ),
                  )}
                </ul>
              )}
            </div>
          );
        })
      )}

      {canEdit && selected.length > 0 && editing === null && (
        <div className="flex flex-col gap-3">
          <h4 className="text-body-md font-semibold">{s.newTitle}</h4>
          <DeliverableForm
            key={formKey}
            idPrefix="deliverable-new"
            levers={leverOptions}
            people={people}
            pending={pending}
            submitLabel={s.add}
            onSubmit={(input) =>
              run(
                () => addDeliverable(projectId, input),
                () => setFormKey((k) => k + 1),
              )
            }
          />
        </div>
      )}
    </section>
  );
}
