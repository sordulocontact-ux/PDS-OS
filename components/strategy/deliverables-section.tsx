"use client";

import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fr } from "@/lib/i18n/fr";
import { addDeliverable, removeDeliverable } from "@/lib/strategy/actions/plan";
import type { StrategyData } from "@/lib/strategy/queries";

const dueFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
});
// Select values cannot be empty: "none" stands for "no assignee".
const NONE = "none";

/** What the selected levers commit to produce. */
export function DeliverablesSection({
  deliverables,
  levers,
  members,
  projectId,
}: Pick<StrategyData, "deliverables" | "levers" | "members"> & {
  projectId: string;
}) {
  const t = fr.strategy.deliverables;
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();
  const selected = levers.filter(
    (l) => l.state === "selected" && l.review_status === "confirmed",
  );
  const leverName = new Map(levers.map((l) => [l.id, l.label]));
  const people = Object.fromEntries(members.map((m) => [m.personId, m.name]));

  const [title, setTitle] = useState("");
  const [lever, setLever] = useState("");
  const [assignee, setAssignee] = useState(NONE);
  const [due, setDue] = useState("");
  // Falls back to the first selected lever until one is picked.
  const leverId = selected.some((l) => l.id === lever)
    ? lever
    : (selected[0]?.id ?? "");

  return (
    <section className="grid gap-3 py-4">
      <div className="grid gap-1">
        <h3 className="text-sm font-medium">{t.title}</h3>
        <p className="text-xs text-muted-foreground">{t.hint}</p>
      </div>

      {deliverables.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="grid gap-2">
          {deliverables.map((d) => (
            <li
              key={d.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="grid gap-0.5 text-sm">
                <span className="font-medium">{d.title}</span>
                <span className="text-xs text-muted-foreground">
                  {[
                    leverName.get(d.lever_id),
                    d.assignee_person_id
                      ? (people[d.assignee_person_id] ?? "—")
                      : t.noAssignee,
                    d.due_date
                      ? dueFormat.format(new Date(`${d.due_date}T12:00:00`))
                      : t.noDueDate,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  aria-label={t.removeLabel(d.title)}
                  onClick={() => run(() => removeDeliverable(projectId, d.id))}
                >
                  {t.remove}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit &&
        (selected.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t.noLever}</p>
        ) : (
          <form
            className="grid gap-2 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              run(
                () =>
                  addDeliverable(projectId, {
                    leverId,
                    title,
                    assigneePersonId: assignee === NONE ? "" : assignee,
                    dueDate: due,
                  }),
                () => {
                  setTitle("");
                  setDue("");
                },
              );
            }}
          >
            <div className="grid gap-1 sm:col-span-2">
              <Label htmlFor="deliverable-title">{t.name}</Label>
              <Input
                id="deliverable-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="deliverable-lever">{t.lever}</Label>
              <OptionSelect
                id="deliverable-lever"
                label={t.lever}
                options={Object.fromEntries(
                  selected.map((l) => [l.id, l.label]),
                )}
                value={leverId}
                onChange={setLever}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="deliverable-assignee">{t.assignee}</Label>
              <OptionSelect
                id="deliverable-assignee"
                label={t.assignee}
                options={{ [NONE]: t.noAssignee, ...people }}
                value={assignee}
                onChange={setAssignee}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="deliverable-due">{t.dueDate}</Label>
              <Input
                id="deliverable-due"
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              className="self-end justify-self-start"
              disabled={pending || title.trim() === "" || !leverId}
            >
              {fr.framing.actions.add}
            </Button>
          </form>
        ))}
    </section>
  );
}
