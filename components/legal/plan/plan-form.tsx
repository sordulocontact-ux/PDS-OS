"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FormMessage } from "@/components/auth/form-message";
import {
  PlanItemRow,
  type PlanChoice,
} from "@/components/legal/plan/plan-item-row";
import { ActionGroup } from "@/components/legal/plan/action-group";
import { EmptyNote } from "@/components/shell/empty-state";
import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import { fr } from "@/lib/i18n/fr";
import { launchLegalPlan } from "@/lib/legal/plan/actions";
import { groupActions, lineOf } from "@/lib/legal/plan/groups";
import { PLAN_COLUMNS } from "@/lib/legal/plan/proposal";
import type { PlanRow } from "@/lib/legal/plan/queries";

/**
 * The proposed plan, in ticket 07's three columns, then « Lancer le plan »:
 * the one human decision (« Confirmation du plan avant lancement »). The
 * server rebuilds the items; only these choices are sent.
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
  const router = useRouter();
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
      if (result.ok) router.refresh();
      else setError(result.error);
    });

  if (items.length === 0) return <EmptyNote>{t.nothing}</EmptyNote>;

  return (
    <div className="grid gap-8">
      {PLAN_COLUMNS.map((column) => {
        const rows = items.filter((item) => item.column === column);
        return (
          <PageSection
            key={column}
            card
            id={`legal-plan-${column}`}
            title={t.columns[column].title}
            description={t.columns[column].description}
          >
            {rows.length === 0 ? (
              <EmptyNote>{t.empty}</EmptyNote>
            ) : (
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
            )}
          </PageSection>
        );
      })}
      <div className="flex flex-col items-end gap-3">
        <p className="text-sm text-muted-foreground">{t.notice}</p>
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
