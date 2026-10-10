import Link from "next/link";
import { IconScale } from "nucleo-sharp-essential";

import { ClearanceBody } from "@/components/legal/clearance/clearance-drawer";
import { MappingPanel } from "@/components/legal/contracts/mapping-panel";
import { FormalityCard } from "@/components/legal/formalities/formality-card";
import { AddedActions } from "@/components/legal/tracking/added-actions";
import { ContractPanel } from "@/components/legal/tracking/contract-panel";
import { DelegateButton } from "@/components/legal/tracking/delegate-button";
import { FichePanel } from "@/components/legal/tracking/fiche-panel";
import { NextCard } from "@/components/legal/tracking/next-card";
import {
  PlanRowSheet,
  type PlanRowView,
} from "@/components/legal/tracking/plan-row-sheet";
import { SplitPanel } from "@/components/legal/tracking/split-panel";
import { EmptyNote, EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { FilterChipLink } from "@/components/ui/filter-chip";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatTiles } from "@/components/ui/stat-tiles";
import { StatusBadge } from "@/components/ui/status-badge";
import { routes } from "@/lib/auth/redirects";
import type { ContractProof } from "@/lib/contracts/proof";
import { fr } from "@/lib/i18n/fr";
import type { Clearances } from "@/lib/legal/clearance/types";
import type { Agreements } from "@/lib/legal/contracts/queries";
import type { TitleFormality } from "@/lib/legal/formalities/types";
import type { FormRow } from "@/lib/legal/forms/queries";
import {
  planBoard,
  type BoardRow,
  type BoardSection,
} from "@/lib/legal/plan/board";
import { legalActionHref } from "@/lib/legal/plan/where";
import type { TitleSplit } from "@/lib/legal/splits/queries";
import type { LegalTracking } from "@/lib/legal/tracking/queries";
import { TRACK_GROUPS } from "@/lib/legal/tracking/state";
import { titleHue } from "@/lib/ui/category-hues";
import { viewHref } from "@/lib/ui/view-href";

// The views of the plan: what waits for someone of the team (the default),
// the whole plan, or one attention group (a tile).
export const TRACKING_VIEWS = ["act", "all", ...TRACK_GROUPS] as const;
export type TrackingViewKey = (typeof TRACKING_VIEWS)[number];
export const asTrackingView = (value: unknown): TrackingViewKey =>
  TRACKING_VIEWS.includes(value as TrackingViewKey)
    ? (value as TrackingViewKey)
    : "act";

export type PlanData = {
  forms: FormRow[];
  agreements: Agreements;
  splits: TitleSplit[];
  clearances: Clearances;
  formalities: TitleFormality[];
  proof: Record<string, ContractProof>;
};

/**
 * The Plan d'action once launched, as the prototype of 07/10/2026 drew it
 * (Sacha, 08/10/2026): one card per démarche in the order they unlock, one
 * line per person, title or borrowing with its state in a badge and the
 * verb of what to do; the line opens the panel where it is done. The
 * attention groups count above and filter (ticket Juridique 07); « Prêt
 * pour la sortie » beside.
 */
export function TrackingView({
  projectId,
  tracking,
  view,
  data,
  titles,
}: {
  projectId: string;
  tracking: LegalTracking;
  view: TrackingViewKey;
  data: PlanData;
  // The project's titles, in order: their tag's hue.
  titles: Array<{ id: string; title: string }>;
}) {
  const t = fr.legal.tracking;
  if (tracking.state === "not_launched")
    return (
      <div className="grid gap-8">
        <EmptyState
          icon={IconScale}
          title={t.notLaunched.title}
          body={t.notLaunched.body}
          action={
            <Button
              nativeButton={false}
              render={
                <Link href={routes.projectLegalStep(projectId, "plan")} />
              }
            >
              {t.notLaunched.action}
            </Button>
          }
        />
      </div>
    );

  const board = planBoard({
    projectId,
    items: tracking.items,
    forms: data.forms,
    agreements: data.agreements.rows,
    mappingApproved: data.agreements.approval !== null,
    splits: data.splits,
    clearances: data.clearances.items,
    formalities: data.formalities,
    canValidate: data.clearances.canValidate,
  });
  const path = routes.projectLegalStep(projectId, "plan");
  const hrefOf = (key: TrackingViewKey) =>
    viewHref(path, { view: key === "act" ? null : key });
  const position = new Map(titles.map((title, i) => [title.id, i]));

  const shown = (row: BoardRow) =>
    view === "all"
      ? true
      : view === "act"
        ? row.group === "now" || row.group === "decision"
        : view === "silent"
          ? row.group === "silent" || row.group === "done"
          : row.group === view;

  const viewOf = (row: BoardRow): PlanRowView => {
    const index = row.masterId ? position.get(row.masterId) : undefined;
    return {
      label: row.label,
      tag:
        index !== undefined
          ? { label: titles[index].title, hue: titleHue(index) }
          : null,
      meta: row.meta,
      badge: row.badge,
      verb: row.verb,
      emphasis:
        row.group === "decision"
          ? "decision"
          : row.group === "now"
            ? "act"
            : "quiet",
    };
  };

  const body = (row: BoardRow) => {
    const panel = row.panel;
    switch (panel.kind) {
      case "fiche":
        return <FichePanel projectId={projectId} row={panel.row} />;
      case "mapping":
        return (
          <MappingPanel
            projectId={projectId}
            rows={data.agreements.rows}
            approval={data.agreements.approval}
          />
        );
      case "contract":
        return (
          <ContractPanel
            projectId={projectId}
            row={panel.row}
            canValidate={data.clearances.canValidate}
            organizationId={data.clearances.organizationId}
            proof={
              panel.row.contract
                ? (data.proof[panel.row.contract.id] ?? null)
                : null
            }
          />
        );
      case "split":
        return <SplitPanel projectId={projectId} split={panel.split} />;
      case "clearance":
        return (
          <ClearanceBody
            projectId={projectId}
            clearance={panel.clearance}
            context={data.clearances}
          />
        );
      case "sacem":
        return (
          <>
            {row.item?.current === "blocked" && (
              <NextCard
                kind="wait"
                label={fr.legal.panels.sacem.waits}
                title={row.badge.label}
              />
            )}
            <FormalityCard projectId={projectId} title={panel.title} />
          </>
        );
      case "link":
        return panel.href ? (
          <Button
            variant="outline"
            className="self-start"
            nativeButton={false}
            render={<Link href={panel.href} />}
          >
            {fr.legal.board.open}
          </Button>
        ) : null;
    }
  };

  const footer = (row: BoardRow) =>
    row.panel.kind === "mapping" ? null : (
      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        {row.item && row.group !== "done" ? (
          <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {fr.legal.board.responsible} ·{" "}
            {row.item.responsibleName ?? fr.legal.plan.noResponsible}
            <DelegateButton
              projectId={projectId}
              itemId={row.item.id}
              label={row.item.label}
              responsibleId={row.item.responsibleId}
              dueOn={row.item.dueOn}
              people={tracking.people}
            />
          </span>
        ) : (
          <span />
        )}
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={legalActionHref(projectId, row.section)} />}
        >
          {fr.legal.board.open}
        </Button>
      </div>
    );

  const line = (row: BoardRow, section: BoardSection) => (
    <PlanRowSheet
      key={row.id}
      view={viewOf(row)}
      section={section.title}
      sub={row.meta.join(" · ")}
    >
      {body(row)}
      {footer(row)}
    </PlanRowSheet>
  );

  const cards = board.sections.flatMap((section) => {
    const visible = section.rows.filter(shown);
    if (visible.length === 0) return [];
    const open =
      view === "all"
        ? visible.filter((r) => r.group === "now" || r.group === "decision")
        : visible;
    const folds =
      view === "all"
        ? [
            {
              key: "waiting",
              label: t.fold.waiting,
              rows: visible.filter((r) => r.group === "waiting"),
            },
            {
              key: "blocked",
              label: t.fold.blocked,
              rows: visible.filter((r) => r.group === "silent"),
            },
            {
              key: "done",
              label: t.fold.done,
              rows: visible.filter((r) => r.group === "done"),
            },
          ].filter((fold) => fold.rows.length > 0)
        : [];
    return [
      <section
        key={section.kind}
        id={`legal-${section.kind}`}
        className="flex flex-col rounded-2xl border bg-card px-5 pt-4 pb-2"
      >
        <div className="flex flex-col gap-0.5 pb-3">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
            <h2 className="font-medium">{section.title}</h2>
            {section.after && (
              <span className="text-sm text-muted-foreground">
                {fr.legal.plan.after(section.after)}
              </span>
            )}
          </div>
          <span className="text-sm text-muted-foreground tabular-nums">
            {fr.legal.board.progress(section.done, section.rows.length)}
          </span>
        </div>
        <div className="flex flex-col">
          {open.map((row) => line(row, section))}
        </div>
        {folds.map((fold) => (
          <details key={fold.key} className="border-t py-2">
            <summary className="cursor-pointer list-none py-1 text-sm text-muted-foreground marker:hidden">
              {fold.label(
                fold.rows.length,
                fold.rows.map((r) => r.label).join(", "),
              )}
            </summary>
            <div className="flex flex-col">
              {fold.rows.map((row) => line(row, section))}
            </div>
          </details>
        ))}
      </section>,
    ];
  });
  const hidden = board.sections.length - cards.length;
  const ready = board.blocking.length === 0;
  // Atteint only when nothing at all remains open.
  const reached = ready && board.remaining.length === 0;
  const SHOWN_REMAINING = 5;

  return (
    <div className="grid gap-8">
      <StatTiles
        columns={4}
        stats={TRACK_GROUPS.map((group) => ({
          label: t.groups[group].title,
          value: String(board.counts[group]),
          href: hrefOf(view === group ? "act" : group),
          view: { current: view === group },
        }))}
      />
      <nav aria-label={t.viewsLabel} className="flex flex-wrap gap-2">
        {(["act", "all"] as const).map((key) => (
          <FilterChipLink
            key={key}
            href={hrefOf(key)}
            current={view === key}
            variant="soft"
          >
            {t.views[key]}
          </FilterChipLink>
        ))}
      </nav>
      {tracking.added > 0 && (
        <AddedActions projectId={projectId} count={tracking.added} />
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex min-w-0 flex-col gap-4">
          {cards.length > 0 ? (
            cards
          ) : (
            <EmptyNote>{t.viewEmpty[view]}</EmptyNote>
          )}
          {hidden > 0 && view !== "all" && cards.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {t.hidden(hidden)}{" "}
              <Link
                href={hrefOf("all")}
                className="underline underline-offset-4"
              >
                {t.views.all}
              </Link>
            </p>
          )}
          <p className="text-sm text-muted-foreground">{t.integrations}</p>
        </div>

        <aside className="flex flex-col gap-3 rounded-2xl border bg-card p-4 lg:sticky lg:top-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-medium">{t.readiness.title}</h2>
            <StatusBadge
              tone={reached ? "success" : ready ? "info" : "warning"}
              size="sm"
            >
              {reached
                ? t.readiness.reached
                : ready
                  ? t.readiness.toFollow
                  : t.readiness.notYet}
            </StatusBadge>
          </div>
          {board.borrowings > 0 ? (
            <>
              <ProgressBar
                value={board.secured}
                max={board.borrowings}
                label={fr.legal.board.readiness.borrowings(
                  board.secured,
                  board.borrowings,
                )}
              />
              <p className="text-sm tabular-nums">
                {fr.legal.board.readiness.borrowings(
                  board.secured,
                  board.borrowings,
                )}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {fr.legal.board.readiness.noBorrowing}
            </p>
          )}
          {reached ? (
            <p className="text-sm text-muted-foreground">{t.readiness.ready}</p>
          ) : ready ? (
            <>
              <p className="text-sm">
                {t.readiness.remaining(board.remaining.length)}
              </p>
              <ul className="flex flex-col gap-1">
                {board.remaining.slice(0, SHOWN_REMAINING).map((row) => (
                  <li key={row.id}>
                    <a
                      href={`#legal-${row.section}`}
                      className="text-sm break-words underline-offset-4 hover:underline"
                    >
                      {row.label}
                    </a>
                  </li>
                ))}
              </ul>
              {board.remaining.length > SHOWN_REMAINING && (
                <p className="text-sm text-muted-foreground">
                  {t.readiness.more(board.remaining.length - SHOWN_REMAINING)}
                </p>
              )}
            </>
          ) : (
            <ul className="flex flex-col gap-2">
              {board.blocking.map((row) => (
                <li key={row.id} className="flex flex-col gap-1">
                  <a
                    href={`#legal-${row.section}`}
                    className="text-sm font-medium break-words underline-offset-4 hover:underline"
                  >
                    {row.label}
                  </a>
                  <StatusBadge
                    tone={row.badge.tone}
                    size="sm"
                    className="self-start"
                  >
                    {row.badge.label}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
          <p className="border-t pt-3 text-caption text-muted-foreground">
            {t.readiness.policy}
          </p>
        </aside>
      </div>
    </div>
  );
}
