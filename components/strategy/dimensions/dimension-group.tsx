import type { ReactNode } from "react";

import { BudgetBlock } from "@/components/strategy/dimensions/budget-block";
import { ConfirmStrategyDimension } from "@/components/strategy/dimensions/confirm-strategy-dimension";
import { LeverState } from "@/components/strategy/dimensions/lever-state";
import { StrategyAddForm } from "@/components/strategy/dimensions/strategy-add-form";
import { StrategyLine } from "@/components/strategy/dimensions/strategy-line";
import { DimensionItem } from "@/components/ui/dimension-list";
import { ProposalAdd, ProposalRows } from "@/components/ui/proposal-group";
import { InfoRow, Rows } from "@/components/ui/rows";
import { decisions } from "@/lib/i18n/fr/decisions";
import { strategyDimensions } from "@/lib/i18n/fr/strategy-dimensions";
import type { DimensionView } from "@/lib/strategy/dimension-model";
import { strategyDimensionTone } from "@/lib/ui/state-tones";

const fr = { decisions, strategyDimensions };

const t = fr.strategyDimensions;

// Dimensions whose rows are listed in detail under them.
const LIST_DIMENSIONS = new Set<DimensionView["key"]>([
  "audiences",
  "deliverables",
  "calendar",
  "objectives",
]);

/**
 * One dimension of « Les 8 dimensions », on the Cadrage's frame
 * (`DimensionItem`, Sacha 06/11/2026): its name, « n à confirmer » and its
 * state; open, its lines (levers with their state, budget lines with
 * theirs), each correctable or set aside on its own, then « Confirmer les
 * n » for the proposals read, « Ajouter … », `extra` (the upstream
 * deadlines) and what the ticket asks beyond the proto (`details`, shown:
 * no fold inside the fold). A list dimension's kept rows live only in its
 * detailed list.
 */
export function DimensionGroup({
  projectId,
  view,
  canEdit,
  exchange,
  open,
  extra,
  details,
}: {
  projectId: string;
  view: DimensionView;
  canEdit: boolean;
  // The strategy started from an exchange: « Rien n'a été dit… ».
  exchange: boolean;
  open: boolean;
  extra?: ReactNode;
  details?: ReactNode;
}) {
  const levers = view.levers ?? [];
  const empty =
    view.key === "levers"
      ? levers.length === 0
      : view.key !== "budget" && view.items.length === 0;
  // A list dimension shows its kept rows in its own detailed list
  // (`details`: publics, deliverables, milestones, KPIs, each with its
  // empty sentence and « Ajouter »): its lines are only what is left to
  // decide, never the same row twice (Sacha 06/11/2026: « on comprend
  // rien »). The publics' written answer has no row: it stays a line.
  const listed = LIST_DIMENSIONS.has(view.key);
  const lines = listed
    ? view.items.filter(
        (i) => i.proposal.state !== "kept" || i.target.type === "field",
      )
    : view.items;
  const proposed = view.items.filter((i) => i.proposal.state === "proposed");
  const confirmTogether = canEdit && proposed.length > 0;
  const line = (item: (typeof view.items)[number]) => (
    <StrategyLine
      key={item.proposal.id}
      projectId={projectId}
      item={item}
      canEdit={canEdit}
      confirmInGroup={confirmTogether}
    />
  );
  // The details say their own emptiness (« Aucun public décrit… », the
  // parts « Pas encore renseigné »): the dimension's sentence only where
  // nothing else does (the levers).
  const saysEmpty = empty && view.key === "levers";
  const adds = canEdit && view.canAdd && !listed;
  const after = (saysEmpty || view.budget || extra || details || adds) && (
    <div className="flex flex-col gap-5 border-t border-[color:var(--border-hairline)] px-3.5 py-4 first:border-t-0">
      {saysEmpty && (
        <p className="text-caption text-muted-foreground">
          {exchange ? fr.decisions.proposal.nothingSaid : t.nothingYet}
        </p>
      )}
      {adds && (
        <ProposalAdd label={t.add[view.key]}>
          <StrategyAddForm
            projectId={projectId}
            dimension={view.key}
            leverOptions={view.leverOptions}
          />
        </ProposalAdd>
      )}
      {view.budget && <BudgetBlock budget={view.budget} />}
      {extra}
      {details}
    </div>
  );

  return (
    <DimensionItem
      id={`dim-${view.key}`}
      name={t.names[view.key]}
      open={open}
      badges={[
        view.toConfirm > 0 && {
          tone: "info",
          label: t.toConfirm(view.toConfirm),
        },
        empty &&
          exchange &&
          view.toConfirm === 0 && {
            tone: "neutral",
            label: t.nothingSaidMeta,
          },
        {
          tone: strategyDimensionTone[view.state],
          label: t.states[view.state],
        },
      ]}
      footer={
        <>
          {confirmTogether && (
            <ConfirmStrategyDimension
              projectId={projectId}
              dimension={view.key}
              lines={proposed.map((i) => i.target)}
            />
          )}
          {after}
        </>
      }
    >
      {view.key === "levers" && levers.length > 0 && (
        <Rows label={t.names.levers} flush>
          {levers.map((l) =>
            l.kind === "proposal" ? (
              <li key={l.item.proposal.id}>{line(l.item)}</li>
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
      {view.key !== "levers" && lines.length > 0 && (
        <ProposalRows flush>{lines.map(line)}</ProposalRows>
      )}
    </DimensionItem>
  );
}
