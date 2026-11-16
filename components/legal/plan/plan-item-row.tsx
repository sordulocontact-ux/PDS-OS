"use client";

import { Field } from "@/components/auth/field";
import { OptionSelect } from "@/components/projects/option-select";
import { Button } from "@/components/ui/button";
import { FactRowFrame } from "@/components/ui/fact-row-frame";
import { legal } from "@/lib/i18n/fr/legal";
import { legalDemarches } from "@/lib/i18n/fr/legal-demarches";
import type { LegalDemarcheKind } from "@/lib/ui/legal-steps";
import { formatDay } from "@/lib/utils/day";

const fr = { legal, legalDemarches };

export type PlanChoice = {
  include: boolean;
  responsibleId: string | null;
  dueOn: string | null;
};

const NONE = "none";

/**
 * One démarche of the proposed plan, as the journey will name it (Sacha,
 * 06/11/2026: « Sami Kader · fiche et contrat »): what it holds or waits
 * for under it, who answers for it and by when on the right, read without
 * a field. A click on the row opens why it exists, its responsible and its
 * due date (« responsabilités, dépendances et calendrier », Juridique 07),
 * and « Retirer du plan » (« Justine valide ou corrige », Juridique 03).
 * The choices are sent with « Lancer le plan d'action ».
 */
export function PlanItemRow({
  itemKey,
  kind,
  title,
  source,
  choice,
  people,
  open,
  onToggle,
  onChange,
}: {
  itemKey: string;
  kind: LegalDemarcheKind;
  title: string;
  source: string | null;
  choice: PlanChoice;
  people: Array<{ personId: string; name: string }>;
  open: boolean;
  onToggle: () => void;
  onChange: (choice: PlanChoice) => void;
}) {
  const t = fr.legal.plan;
  const d = t.demarches;
  const id = `plan-${itemKey.replace(/[^a-z0-9-]/gi, "-")}`;
  const nameOf = (personId: string | null) =>
    people.find((p) => p.personId === personId)?.name ?? t.noResponsible;
  const row = {
    value: choice.include ? (
      title
    ) : (
      <span className="text-[color:var(--text-tertiary)] line-through">
        {title}
      </span>
    ),
    source: choice.include ? source : d.removedNote,
    state: choice.include
      ? null
      : { tone: "neutral" as const, label: d.removed },
    side: choice.include ? (
      <span className="flex flex-col md:items-end">
        <span>{nameOf(choice.responsibleId)}</span>
        {choice.dueOn && (
          <span className="text-caption text-[color:var(--text-secondary)] tabular-nums">
            {formatDay(choice.dueOn)}
          </span>
        )}
      </span>
    ) : null,
  };
  if (!open)
    return (
      <FactRowFrame {...row} onClick={onToggle} hrefLabel={d.edit(title)} />
    );
  return (
    <>
      <FactRowFrame {...row} />
      <div className="flex flex-col gap-3.5 border-b border-[color:var(--border-hairline)] bg-[var(--surface-soft)] px-3.5 py-3.5 last:border-b-0 modern:gap-4 modern:px-4 modern:py-4">
        <p className="text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)] text-[color:var(--text-secondary)]">
          {fr.legalDemarches.why[kind]}
        </p>
        {choice.include && (
          <div className="grid gap-3 sm:grid-cols-2">
            <OptionSelect
              id={`${id}-responsible`}
              name={`${id}-responsible`}
              label={t.responsible}
              items={{
                [NONE]: t.noResponsible,
                ...Object.fromEntries(people.map((p) => [p.personId, p.name])),
              }}
              defaultValue={choice.responsibleId ?? NONE}
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
              label={t.due}
              defaultValue={choice.dueOn ?? ""}
              onChange={(event) =>
                onChange({ ...choice, dueOn: event.target.value || null })
              }
            />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onToggle}>
            {d.close}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => onChange({ ...choice, include: !choice.include })}
          >
            {choice.include ? d.remove : d.restore}
          </Button>
        </div>
      </div>
    </>
  );
}
