"use client";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/projects/option-select";
import { fr } from "@/lib/i18n/fr";
import type { PlanRow } from "@/lib/legal/plan/queries";
import { cn } from "@/lib/utils";

export type PlanChoice = {
  include: boolean;
  responsibleId: string | null;
  dueOn: string | null;
};

const NONE = "none";

/**
 * One action of the proposed plan: keep it or not (« Justine valide ou
 * corrige la cartographie », Juridique 03), what it waits for, who answers
 * for it and by when (« responsabilités, dépendances et calendrier », 07).
 */
export function PlanItemRow({
  item,
  after,
  choice,
  people,
  onChange,
}: {
  item: PlanRow;
  // Labels of the actions it waits for.
  after: string[];
  choice: PlanChoice;
  people: Array<{ personId: string; name: string }>;
  onChange: (choice: PlanChoice) => void;
}) {
  const t = fr.legal.plan;
  const id = `plan-${item.key.replace(/[^a-z0-9-]/gi, "-")}`;
  return (
    <li
      className={cn(
        "flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:gap-4",
        !choice.include && "opacity-60",
      )}
    >
      <label className="flex min-w-0 flex-1 items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-4 shrink-0 accent-selection"
          checked={choice.include}
          aria-label={t.include(item.label)}
          onChange={(event) =>
            onChange({ ...choice, include: event.target.checked })
          }
        />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-medium break-words">{item.label}</span>
          {item.detail && (
            <span className="text-sm break-words text-muted-foreground">
              {item.detail}
            </span>
          )}
          {item.why && (
            <span className="text-sm break-words text-muted-foreground">
              {item.why}
            </span>
          )}
          {after.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {t.after(after.join(", "))}
            </span>
          )}
        </span>
      </label>
      {/* Kept mounted when the action is left out (inert), so its choices
          come back as they were if it is kept again. */}
      <div
        inert={!choice.include}
        className="grid gap-3 sm:w-[22rem] sm:shrink-0 sm:grid-cols-2"
      >
        <OptionSelect
          id={`${id}-responsible`}
          name={`${id}-responsible`}
          label={t.responsible}
          items={{
            [NONE]: t.noResponsible,
            ...Object.fromEntries(people.map((p) => [p.personId, p.name])),
          }}
          // The initial value: these fields remount when it changes.
          defaultValue={item.responsibleId ?? NONE}
          onValueChange={(value) =>
            onChange({
              ...choice,
              responsibleId: value === NONE ? null : value,
            })
          }
        />
        <Field
          id={`${id}-due`}
          name={`${id}-due`}
          type="date"
          label={`${t.due} · ${t.optional}`}
          defaultValue={item.dueOn ?? ""}
          onChange={(event) =>
            onChange({ ...choice, dueOn: event.target.value || null })
          }
        />
      </div>
    </li>
  );
}
