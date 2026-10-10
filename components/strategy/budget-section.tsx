"use client";

import { useState } from "react";

import { OptionSelect } from "@/components/framing/option-select";
import { useFramingAction } from "@/components/framing/use-framing-action";
import { useCanEditProject } from "@/components/projects/edit-access";
import { labelClass, optionClass } from "@/components/strategy/option-class";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatTiles } from "@/components/ui/stat-tiles";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToneCallout } from "@/components/ui/tone-callout";
import { formatEuros } from "@/lib/budget/types";
import { fr } from "@/lib/i18n/fr";
import {
  addBudgetLine,
  removeBudgetLine,
  setBudgetLineState,
  setBudgetNone,
} from "@/lib/strategy/actions/dimensions";
import { budgetByLever, budgetSums } from "@/lib/strategy/budget";
import type { StrategyData } from "@/lib/strategy/queries";

const NONE = "none";
type LineState = "validated" | "to_decide";

/**
 * Budget stratégie (ticket § 6): lines by lever, validated or to arbitrate;
 * totals and split computed by code. Internal: never in the external
 * documents, never read by PO.
 */
export function BudgetSection({
  lines,
  levers,
  none,
  envelopeCents,
  projectId,
}: {
  lines: StrategyData["budgetLines"];
  levers: StrategyData["levers"];
  none: boolean;
  envelopeCents: number | null;
  projectId: string;
}) {
  const t = fr.strategyFlow.budget;
  const { pending, run } = useFramingAction();
  const canEdit = useCanEditProject();
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [lever, setLever] = useState(NONE);
  const [state, setState] = useState<LineState>("to_decide");
  const sums = budgetSums(lines);
  const leverName = new Map(levers.map((l) => [l.id, l.label]));
  const selectable = levers.filter((l) => l.state !== "rejected");

  return (
    <div className="flex flex-col gap-6">
      <ToneCallout tone="neutral">{t.internal}</ToneCallout>
      <p className="text-caption text-muted-foreground">
        {envelopeCents !== null
          ? t.envelope(formatEuros(envelopeCents))
          : t.noEnvelope}
      </p>
      {none ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-body-md font-medium">{t.noneSet}</p>
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => run(() => setBudgetNone(projectId, false))}
            >
              {t.undoNone}
            </Button>
          )}
        </div>
      ) : (
        <>
          <StatTiles
            columns={3}
            stats={[
              { label: t.tiles.proposed, value: formatEuros(sums.proposed) },
              { label: t.tiles.validated, value: formatEuros(sums.validated) },
              { label: t.tiles.toDecide, value: formatEuros(sums.toDecide) },
            ]}
          />
          {envelopeCents !== null && sums.proposed > envelopeCents && (
            <ToneCallout tone="warning">
              {t.overEnvelope(formatEuros(sums.proposed - envelopeCents))}
            </ToneCallout>
          )}
          {lines.length === 0 ? (
            <p className="text-body-md text-muted-foreground">{t.empty}</p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <p className={labelClass}>{t.byLever}</p>
                <ul className="flex flex-col gap-1 text-body-md">
                  {budgetByLever(lines).map((g) => (
                    <li
                      key={g.leverId ?? NONE}
                      className="flex justify-between gap-3"
                    >
                      <span className="min-w-0 break-words">
                        {(g.leverId && leverName.get(g.leverId)) || t.noLever}
                      </span>
                      <span className="font-semibold tabular-nums">
                        {formatEuros(g.proposed)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <ul className="flex flex-col gap-3">
                {lines.map((line) => (
                  <li
                    key={line.id}
                    className={`${optionClass(false)} flex-wrap justify-between`}
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="font-semibold break-words">
                        {line.label}
                      </span>
                      <span className="text-caption text-muted-foreground">
                        {(line.lever_id && leverName.get(line.lever_id)) ||
                          t.noLever}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold tabular-nums">
                        {formatEuros(line.amount_cents)}
                      </span>
                      {canEdit ? (
                        <OptionSelect
                          id={`budget-state-${line.id}`}
                          label={t.state}
                          options={t.states}
                          value={line.state}
                          onChange={(v) =>
                            run(() =>
                              setBudgetLineState(
                                projectId,
                                line.id,
                                v as LineState,
                              ),
                            )
                          }
                        />
                      ) : (
                        <StatusBadge
                          tone={
                            line.state === "validated" ? "success" : "warning"
                          }
                          size="sm"
                        >
                          {t.states[line.state as LineState]}
                        </StatusBadge>
                      )}
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pending}
                          aria-label={t.removeLabel(line.label)}
                          onClick={() =>
                            run(() => removeBudgetLine(projectId, line.id))
                          }
                        >
                          {t.remove}
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
          {canEdit && (
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                run(
                  () =>
                    addBudgetLine(projectId, {
                      label,
                      amount,
                      leverId: lever === NONE ? "" : lever,
                      state,
                    }),
                  () => {
                    setLabel("");
                    setAmount("");
                  },
                );
              }}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="budget-label" className={labelClass}>
                  {t.label}
                </Label>
                <Input
                  id="budget-label"
                  value={label}
                  maxLength={200}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="budget-amount" className={labelClass}>
                  {t.amount}
                </Label>
                <Input
                  id="budget-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="budget-lever" className={labelClass}>
                  {t.lever}
                </Label>
                <OptionSelect
                  id="budget-lever"
                  label={t.lever}
                  options={{
                    [NONE]: t.noLever,
                    ...Object.fromEntries(
                      selectable.map((l) => [l.id, l.label]),
                    ),
                  }}
                  value={lever}
                  onChange={setLever}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="budget-state" className={labelClass}>
                  {t.state}
                </Label>
                <OptionSelect
                  id="budget-state"
                  label={t.state}
                  options={t.states}
                  value={state}
                  onChange={(v) => setState(v as LineState)}
                />
              </div>
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <Button
                  type="submit"
                  variant="outline"
                  disabled={
                    pending || label.trim() === "" || amount.trim() === ""
                  }
                >
                  {t.add}
                </Button>
                {lines.length === 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => run(() => setBudgetNone(projectId, true))}
                  >
                    {t.none}
                  </Button>
                )}
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
