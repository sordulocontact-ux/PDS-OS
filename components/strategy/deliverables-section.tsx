"use client";

import { useState } from "react";

import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { DeliverableForm } from "@/components/strategy/deliverable-form";
import { DeliverableItem } from "@/components/strategy/deliverable-item";
import { DeliverableLotForm } from "@/components/strategy/deliverable-lot-form";
import { DeliverablesBulkBar } from "@/components/strategy/deliverables-bulk-bar";
import { Button } from "@/components/ui/button";
import { FormDialog } from "@/components/ui/form-dialog";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { strategy } from "@/lib/i18n/fr/strategy";
import { strategyDeliverables } from "@/lib/i18n/fr/strategy-deliverables";
import {
  addDeliverable,
  removeDeliverable,
  updateDeliverable,
} from "@/lib/strategy/actions/deliverables";
import { updateLever } from "@/lib/strategy/actions/levers";
import { lotForLever } from "@/lib/strategy/deliverable-lots";
import type { StrategyData } from "@/lib/strategy/queries";

const fr = { dialogs, strategy, strategyDeliverables };

// A lever's deliverables, and the form to add one: apart from the next by
// a hairline only, never a box (Sacha 07/11/2026).
const part =
  "flex flex-col gap-3 border-t border-[color:var(--border-hairline)] pt-4 first-of-type:border-t-0 first-of-type:pt-0";

/**
 * « Livrables engagés »: what the selected levers commit to produce, grouped
 * by lever. Nature and number are typed by the owner, never preset; once the
 * Stratégie is validated they become the Conception's inputs.
 */
export function DeliverablesSection({
  deliverables,
  levers,
  members,
  milestones,
  projectId,
}: Pick<StrategyData, "deliverables" | "levers" | "members" | "milestones"> & {
  projectId: string;
}) {
  const t = fr.strategy.deliverables;
  const s = fr.strategyDeliverables;
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();
  const [editing, setEditing] = useState<string | null>(null);
  // Bumped once a deliverable is added: its form starts empty again.
  const [formKey, setFormKey] = useState(0);
  // MKT-S1-08: the lever whose lot is being proposed, the ticked ones.
  const [lotLever, setLotLever] = useState<string | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) =>
    setPicked((all) =>
      all.includes(id) ? all.filter((x) => x !== id) : [...all, id],
    );
  const milestonesOf = (deliverableId: string) =>
    milestones
      .filter((m) => m.deliverable_id === deliverableId)
      .map((m) => m.title);
  const lotOf = (leverId: string) => {
    const lever = levers.find((l) => l.id === leverId);
    return lever
      ? lotForLever(
          lever.label,
          deliverables
            .filter((d) => d.lever_id === leverId)
            .map((d) => d.title),
        )
      : [];
  };

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
      className="flex flex-col gap-4"
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
            // One part per lever, a hairline above the next (Sacha
            // 07/11/2026: « on se perd »): its name and gestures on one
            // head, its deliverables under it.
            <div key={lever.id} className={part}>
              <div className="flex items-start justify-between gap-3">
                <h4 className="min-w-0 flex-1 pt-1 text-body-md font-semibold break-words">
                  {lever.label}
                </h4>
                {canEdit && lever.state === "selected" && (
                  <span className="flex shrink-0 flex-wrap justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLotLever(lever.id)}
                    >
                      {s.lots.propose}
                    </Button>
                    {own.length === 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() =>
                          run(() =>
                            updateLever(projectId, lever.id, {
                              no_deliverables: !lever.no_deliverables,
                            }),
                          )
                        }
                      >
                        {lever.no_deliverables
                          ? s.noneRequiredUndo
                          : s.noneRequired}
                      </Button>
                    )}
                  </span>
                )}
              </div>
              {own.length === 0 ? (
                <p className="text-caption text-muted-foreground">
                  {lever.no_deliverables ? s.noneRequiredSet : s.noLeverGroup}
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {own.map((d) =>
                    editing === d.id ? (
                      <li key={d.id}>
                        <DeliverableForm
                          idPrefix={`deliverable-${d.id}`}
                          initial={{
                            leverId: d.lever_id ?? "",
                            title: d.title,
                            quantity:
                              d.quantity === null ? "" : String(d.quantity),
                            format: d.format ?? "",
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
                        milestones={milestonesOf(d.id)}
                        selected={picked.includes(d.id)}
                        onToggle={() => toggle(d.id)}
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

      {canEdit && (
        <DeliverablesBulkBar
          projectId={projectId}
          ids={picked}
          people={people}
          onDone={() => setPicked([])}
        />
      )}

      <FormDialog
        open={lotLever !== null}
        onOpenChange={(open) => !open && setLotLever(null)}
        title={s.lots.title(levers.find((l) => l.id === lotLever)?.label ?? "")}
        description={s.lots.description}
        closeLabel={fr.dialogs.close}
      >
        {lotLever && (
          <DeliverableLotForm
            projectId={projectId}
            leverId={lotLever}
            lot={lotOf(lotLever)}
            people={people}
            onDone={() => setLotLever(null)}
          />
        )}
      </FormDialog>

      {canEdit && selected.length > 0 && editing === null && (
        <div className={part}>
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
