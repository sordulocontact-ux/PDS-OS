"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Label } from "@/components/ui/label";
import { fr } from "@/lib/i18n/fr";
import { launchPlan } from "@/lib/plan/actions";
import {
  PLAN_COLUMNS,
  type PlanColumn,
  type ProposedItem,
} from "@/lib/plan/propose";

type Choice = {
  column: PlanColumn;
  removed: boolean;
  ownerPersonId: string | null;
};

const NO_OWNER = "none";

/**
 * The plan PO proposes (ticket § 9), in its four columns. « Modifier le
 * plan » lets the owner move a workflow, change who carries it, or take it
 * out; « Lancer le plan » records it and starts what is in Focus and
 * Pendant ce temps. Nothing is launched before.
 */
export function PlanBoard({
  projectId,
  items,
  members,
  editable,
}: {
  projectId: string;
  items: ProposedItem[];
  members: Array<{ personId: string; name: string }>;
  editable: boolean;
}) {
  const t = fr.framingIntel.plan;
  const router = useRouter();
  const { pending, run } = useFramingAction();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [choices, setChoices] = useState<Record<string, Choice>>(() =>
    Object.fromEntries(
      items.map((item) => [
        item.key,
        {
          column: item.column,
          removed: false,
          ownerPersonId: item.ownerPersonId,
        },
      ]),
    ),
  );
  const set = (key: string, change: Partial<Choice>) =>
    setChoices((all) => ({ ...all, [key]: { ...all[key], ...change } }));
  const nameOf = (id: string | null) =>
    members.find((m) => m.personId === id)?.name ?? t.noOwner;
  const workflowName = (w: string) =>
    t.workflows[w as keyof typeof t.workflows];
  const columnOptions = Object.fromEntries(
    PLAN_COLUMNS.filter((c) => c !== "anticipate").map((c) => [
      c,
      t.columns[c],
    ]),
  );
  const ownerOptions = {
    [NO_OWNER]: t.noOwner,
    ...Object.fromEntries(members.map((m) => [m.personId, m.name])),
  };
  const removed = items.filter((item) => choices[item.key].removed);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_COLUMNS.map((column) => {
          const inColumn = items.filter(
            (item) =>
              !choices[item.key].removed && choices[item.key].column === column,
          );
          return (
            <section
              key={column}
              aria-labelledby={`plan-${column}`}
              className="flex flex-col gap-3 rounded-3xl bg-[var(--surface-tint)] p-4"
            >
              <header className="flex flex-col gap-0.5">
                <h3
                  id={`plan-${column}`}
                  className="text-body-md font-semibold"
                >
                  {t.columns[column]}
                </h3>
                <p className="text-caption text-muted-foreground">
                  {t.columnHints[column]}
                </p>
              </header>
              {inColumn.length === 0 ? (
                <p className="text-caption text-muted-foreground">{t.empty}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {inColumn.map((item) => (
                    <li
                      key={item.key}
                      className="flex flex-col gap-2 rounded-2xl border border-border bg-background p-3"
                    >
                      <p className="text-body-md font-semibold break-words">
                        {item.title}
                      </p>
                      {item.why && (
                        <p className="text-caption text-muted-foreground">
                          {item.why}
                        </p>
                      )}
                      {item.specialized && (
                        <p className="text-caption">
                          {t.specialized(item.specialized)}
                        </p>
                      )}
                      {item.dependsOn.length > 0 && (
                        <p className="text-caption text-muted-foreground">
                          {t.dependsOn(
                            item.dependsOn.map(workflowName).join(", "),
                          )}
                        </p>
                      )}
                      {item.workflow && !editing && (
                        <p className="text-caption">
                          {t.owner} : {nameOf(choices[item.key].ownerPersonId)}
                        </p>
                      )}
                      {editing && item.workflow && (
                        <div className="flex flex-col gap-2">
                          <div className="grid gap-1">
                            <Label
                              htmlFor={`plan-col-${item.key}`}
                              className="text-caption"
                            >
                              {t.move}
                            </Label>
                            <OptionSelect
                              id={`plan-col-${item.key}`}
                              label={t.move}
                              options={columnOptions}
                              value={choices[item.key].column}
                              onChange={(v) =>
                                set(item.key, { column: v as PlanColumn })
                              }
                            />
                          </div>
                          <div className="grid gap-1">
                            <Label
                              htmlFor={`plan-owner-${item.key}`}
                              className="text-caption"
                            >
                              {t.owner}
                            </Label>
                            <OptionSelect
                              id={`plan-owner-${item.key}`}
                              label={t.owner}
                              options={ownerOptions}
                              value={
                                choices[item.key].ownerPersonId ?? NO_OWNER
                              }
                              onChange={(v) =>
                                set(item.key, {
                                  ownerPersonId: v === NO_OWNER ? null : v,
                                })
                              }
                            />
                          </div>
                        </div>
                      )}
                      {editing && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="self-start"
                          onClick={() => set(item.key, { removed: true })}
                        >
                          {t.remove}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {removed.length > 0 && (
        <section aria-labelledby="plan-removed" className="flex flex-col gap-2">
          <h3 id="plan-removed" className="text-body-md font-semibold">
            {t.removedTitle}
          </h3>
          <ul className="flex flex-wrap gap-2">
            {removed.map((item) => (
              <li
                key={item.key}
                className="flex items-center gap-2 text-body-md"
              >
                <span className="text-muted-foreground line-through decoration-1">
                  {item.title}
                </span>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => set(item.key, { removed: false })}
                >
                  {t.restore}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {editable && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            size="lg"
            variant="outline"
            onClick={() => setEditing((v) => !v)}
          >
            {editing ? t.doneEditing : t.edit}
          </Button>
          <Button size="lg" onClick={() => setConfirming(true)}>
            {t.launch}
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t.launchConfirmTitle}
        description={t.launchConfirmBody}
        cancelLabel={fr.framingIntel.guide.cancel}
        closeLabel={fr.framingGuide.close}
        confirmLabel={t.launch}
        pendingLabel={t.launching}
        pending={pending}
        onConfirm={() =>
          run(
            () =>
              launchPlan(
                projectId,
                items.map((item) => ({ key: item.key, ...choices[item.key] })),
              ),
            () => {
              setConfirming(false);
              router.refresh();
            },
          )
        }
      />
    </div>
  );
}
