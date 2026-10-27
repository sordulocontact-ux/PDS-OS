import type { ReactNode } from "react";

import { BudgetBlock } from "@/components/strategy/dimensions/budget-block";
import { LeverState } from "@/components/strategy/dimensions/lever-state";
import { StrategyAddForm } from "@/components/strategy/dimensions/strategy-add-form";
import { StrategyLine } from "@/components/strategy/dimensions/strategy-line";
import { Fold } from "@/components/ui/fold";
import { ProposalGroup, ProposalRows } from "@/components/ui/proposal-group";
import { InfoRow, Rows } from "@/components/ui/rows";
import { decisions } from "@/lib/i18n/fr/decisions";
import { strategyDimensions } from "@/lib/i18n/fr/strategy-dimensions";
import type { DimensionView } from "@/lib/strategy/dimension-model";
import { strategyDimensionTone } from "@/lib/ui/state-tones";

const fr = { decisions, strategyDimensions };

const t = fr.strategyDimensions;

/**
 * One dimension of « Les 8 dimensions » (proto versionCard + dimBody): its
 * name, its state, « n à confirmer », « Ajouter … » in its head; its lines
 * decided one by one (levers with their state, budget lines with theirs);
 * open while it is not complete. `extra`: what follows the lines (the
 * upstream deadlines); `details`: what the ticket asks beyond the proto,
 * folded.
 */
export function DimensionGroup({
  projectId,
  view,
  canEdit,
  exchange,
  extra,
  details,
}: {
  projectId: string;
  view: DimensionView;
  canEdit: boolean;
  // The strategy started from an exchange: « Rien n'a été dit… ».
  exchange: boolean;
  extra?: ReactNode;
  details?: ReactNode;
}) {
  const levers = view.levers ?? [];
  const empty =
    view.key === "levers"
      ? levers.length === 0
      : view.key !== "budget" && view.items.length === 0;
  return (
    <ProposalGroup
      id={`dim-${view.key}`}
      title={t.names[view.key]}
      status={{
        tone: strategyDimensionTone[view.state],
        label: t.states[view.state],
      }}
      toConfirm={view.toConfirm}
      meta={empty && exchange ? t.nothingSaidMeta : undefined}
      defaultOpen={view.state !== "complete"}
      addLabel={canEdit && view.canAdd ? t.add[view.key] : undefined}
      addForm={
        <StrategyAddForm
          projectId={projectId}
          dimension={view.key}
          leverOptions={view.leverOptions}
        />
      }
    >
      {empty && (
        <p className="text-caption text-muted-foreground">
          {exchange ? fr.decisions.proposal.nothingSaid : t.nothingYet}
        </p>
      )}
      {view.key === "levers" && levers.length > 0 && (
        <Rows label={t.names.levers}>
          {levers.map((l) =>
            l.kind === "proposal" ? (
              <li key={l.item.proposal.id}>
                <StrategyLine
                  projectId={projectId}
                  item={l.item}
                  canEdit={canEdit}
                />
              </li>
            ) : (
              <InfoRow
                key={l.key}
                title={l.name}
                detail={[
                  l.source,
                  l.quote && `« ${l.quote} »`,
                  l.by &&
                    (l.state === "retained"
                      ? t.lever.retainedBy(l.by)
                      : l.state === "not_retained"
                        ? t.lever.rejectedBy(l.by)
                        : null),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                badge={
                  <LeverState
                    projectId={projectId}
                    lever={l}
                    canEdit={canEdit}
                  />
                }
              />
            ),
          )}
        </Rows>
      )}
      {view.key !== "levers" && view.items.length > 0 && (
        <ProposalRows>
          {view.items.map((item) => (
            <StrategyLine
              key={item.proposal.id}
              projectId={projectId}
              item={item}
              canEdit={canEdit}
            />
          ))}
        </ProposalRows>
      )}
      {view.budget && <BudgetBlock budget={view.budget} />}
      {extra}
      {details && <Fold summary={t.details[view.key]}>{details}</Fold>}
    </ProposalGroup>
  );
}
