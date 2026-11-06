"use client";

import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import {
  PlanItemRow,
  type PlanChoice,
} from "@/components/legal/plan/plan-item-row";
import { EmptyNote } from "@/components/shell/empty-state";
import { StepSection } from "@/components/shell/journey/step-section";
import { usePublishResult } from "@/components/shell/module/result-banner";
import { Button } from "@/components/ui/button";
import { FactRows } from "@/components/ui/fact-row";
import { Fold } from "@/components/ui/fold";
import { legal } from "@/lib/i18n/fr/legal";
import { demarcheOfItem } from "@/lib/legal/demarches/build";
import { launchLegalPlan } from "@/lib/legal/plan/actions";
import type { PlanRow } from "@/lib/legal/plan/queries";

const fr = { legal };

// The fiches of every incomplete person: one item, no démarche of its own
// (each person's fiche is the first step of their démarche).
const FICHES = "onboarding";

/**
 * The proposed plan (JUR-05), one line per démarche as the journey will
 * show it once launched (Sacha, 06/11/2026: « Sami Kader · fiche et
 * contrat », not the items grouped by kind): the immediate ones apart from
 * the dependent ones, each with what it holds or waits for, who answers for
 * it and by when; a click opens the fields. What launching creates is said
 * once and folded; then « Lancer le plan », the one human decision. The
 * server rebuilds the items; only these choices are sent. The shared
 * fiches follow the démarches: kept while one that needs them is kept.
 */
export function PlanForm({
  projectId,
  items,
  people,
}: {
  projectId: string;
  items: PlanRow[];
  people: Array<{ personId: string; name: string }>;
}) {
  const t = fr.legal.plan;
  const d = t.demarches;
  const [choices, setChoices] = useState<Record<string, PlanChoice>>(() =>
    Object.fromEntries(
      items.map((item) => [
        item.key,
        { include: true, responsibleId: item.responsibleId, dueOn: item.dueOn },
      ]),
    ),
  );
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const publish = usePublishResult();

  const demarches = items.flatMap((item) => {
    const demarche = demarcheOfItem(item);
    return demarche ? [{ item, ...demarche }] : [];
  });
  const kept = (key: string) => choices[key]?.include ?? false;
  // The fiches stay while a démarche that needs them stays (or while
  // nothing else needs them: an incomplete person already under contract).
  const needFiches = items.filter((i) => i.dependsOn.includes(FICHES));
  const fichesKept =
    needFiches.length === 0 || needFiches.some((i) => kept(i.key));
  const titleOf = new Map(demarches.map((x) => [x.item.key, x.title]));
  // What a démarche waits for, among what is kept; a person's own fiche is
  // the first step of their démarche, not something it waits for.
  const waitsFor = (item: PlanRow) =>
    item.dependsOn.filter(
      (key) =>
        !(key === FICHES && item.kind === "contract") &&
        (key === FICHES ? fichesKept : kept(key)),
    );
  const sourceOf = (item: PlanRow) => {
    if (item.kind === "contract")
      return d.person(item.dependsOn.includes(FICHES));
    const waits = waitsFor(item);
    if (waits.length > 0)
      return d.after(
        waits
          .map((key) => (key === FICHES ? d.fiches : titleOf.get(key)))
          .join(", "),
      );
    return item.detail;
  };

  const launch = () =>
    startTransition(async () => {
      setError(null);
      const result = await launchLegalPlan(
        projectId,
        items.map((item) => ({
          key: item.key,
          ...choices[item.key],
          include: item.key === FICHES ? fichesKept : kept(item.key),
        })),
      );
      if (!result.ok) return setError(result.error);
      setOpenKey(null);
      // The banner in the step and the toast (rule 7).
      publish(result);
    });

  if (items.length === 0) return <EmptyNote>{t.nothing}</EmptyNote>;

  const section = (immediate: boolean) => {
    const rows = demarches.filter(
      (x) => (waitsFor(x.item).length === 0) === immediate,
    );
    if (rows.length === 0) return null;
    const s = immediate ? t.sections.immediate : t.sections.dependent;
    return (
      <StepSection title={s.title(rows.filter((x) => kept(x.item.key)).length)}>
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {s.body}
        </p>
        <FactRows>
          {rows.map(({ item, kind, title }) => (
            <PlanItemRow
              key={item.key}
              itemKey={item.key}
              kind={kind}
              title={title}
              source={sourceOf(item)}
              choice={choices[item.key]}
              people={people}
              open={openKey === item.key}
              onToggle={() =>
                setOpenKey((current) =>
                  current === item.key ? null : item.key,
                )
              }
              onChange={(choice) =>
                setChoices((current) => ({ ...current, [item.key]: choice }))
              }
            />
          ))}
        </FactRows>
      </StepSection>
    );
  };
  const created = items.filter((item) =>
    item.key === FICHES ? fichesKept : kept(item.key),
  );

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
        {d.intro}
      </p>
      {section(true)}
      {section(false)}
      <Fold
        className="mt-3.5"
        summary={
          <>
            {t.creates.title}
            <span className="font-medium text-[color:var(--text-tertiary)]">
              · {t.creates.aside}
            </span>
          </>
        }
      >
        <ul className="flex list-disc flex-col gap-1 pl-5 text-[length:var(--type-body-sm)] leading-[var(--type-body-sm-lh)]">
          {created.map((item) => (
            <li key={item.key}>
              {t.creates.line(
                titleOf.get(item.key) ?? item.label,
                t.creates.kind[item.kind],
              )}
            </li>
          ))}
        </ul>
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {t.creates.then}
        </p>
      </Fold>
      <div className="flex flex-col items-start gap-3">
        <Button
          type="button"
          size="lg"
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={launch}
        >
          {pending ? t.launching : t.launch}
        </Button>
        {error && <FormMessage kind="error">{error}</FormMessage>}
      </div>
    </div>
  );
}
