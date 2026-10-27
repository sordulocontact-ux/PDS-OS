"use client";

import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import {
  PlanItemRow,
  type PlanChoice,
} from "@/components/legal/plan/plan-item-row";
import { ActionGroup } from "@/components/legal/plan/action-group";
import { EmptyNote } from "@/components/shell/empty-state";
import { StepSection } from "@/components/shell/journey/step-section";
import { usePublishResult } from "@/components/shell/module/result-banner";
import { Button } from "@/components/ui/button";
import { Fold } from "@/components/ui/fold";
import { legal } from "@/lib/i18n/fr/legal";
import { launchLegalPlan } from "@/lib/legal/plan/actions";
import { groupActions, lineOf } from "@/lib/legal/plan/groups";
import type { PlanRow } from "@/lib/legal/plan/queries";

const fr = { legal };

/**
 * The proposed plan (JUR-05): the immediate démarches apart from the
 * dependent ones, each with what it waits for, who answers for it and by
 * when; what launching creates, said once and folded; then « Lancer le
 * plan », the one human decision. The server rebuilds the items; only
 * these choices are sent.
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
  const [choices, setChoices] = useState<Record<string, PlanChoice>>(() =>
    Object.fromEntries(
      items.map((item) => [
        item.key,
        { include: true, responsibleId: item.responsibleId, dueOn: item.dueOn },
      ]),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const publish = usePublishResult();
  // Only what is still in the plan holds an action back.
  const labelOf = new Map(
    items
      .filter((item) => choices[item.key]?.include)
      .map((item) => [item.key, item.label]),
  );

  const launch = () =>
    startTransition(async () => {
      setError(null);
      const result = await launchLegalPlan(
        projectId,
        items.map((item) => ({ key: item.key, ...choices[item.key] })),
      );
      if (!result.ok) return setError(result.error);
      // The banner in the step and the toast (rule 7).
      publish(result);
    });

  if (items.length === 0) return <EmptyNote>{t.nothing}</EmptyNote>;

  // Immediate: nothing kept in the plan holds it back (JUR-05).
  const kept = items.filter((item) => choices[item.key]?.include);
  const isImmediate = (item: PlanRow) =>
    item.dependsOn.every((key) => !labelOf.has(key));
  const section = (immediate: boolean) => {
    const rows = items.filter((item) => isImmediate(item) === immediate);
    if (rows.length === 0) return null;
    const s = immediate ? t.sections.immediate : t.sections.dependent;
    return (
      <StepSection title={s.title(rows.length)}>
        <p className="text-[length:var(--type-body-sm)] text-[color:var(--text-secondary)]">
          {s.body}
        </p>
        <div className="flex flex-col gap-6">
          {groupActions(rows, labelOf).map((group) => (
            <ActionGroup
              key={group.kind}
              title={group.title}
              count={group.items.length}
              why={group.why}
              after={group.after}
              action={null}
            >
              {group.items.map((item) => (
                <PlanItemRow
                  key={item.key}
                  item={item}
                  line={lineOf(item, group, labelOf)}
                  choice={choices[item.key]}
                  people={people}
                  onChange={(choice) =>
                    setChoices((current) => ({
                      ...current,
                      [item.key]: choice,
                    }))
                  }
                />
              ))}
            </ActionGroup>
          ))}
        </div>
      </StepSection>
    );
  };

  return (
    <div className="flex flex-col gap-3.5">
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
          {kept.map((item) => (
            <li key={item.key}>
              {t.creates.line(item.label, t.creates.kind[item.kind])}
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
