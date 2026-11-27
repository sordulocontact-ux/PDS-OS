"use client";

import type { ReactNode } from "react";

import { DealStageBadge } from "@/components/deals/deal-stage-badge";
import { OpenDealButton } from "@/components/legal/participations/open-deal-button";
import { WaiverActions } from "@/components/legal/participations/waiver-actions";
import { WaiverLines } from "@/components/legal/waiver-lines";
import { contractStatePill } from "@/components/projects/titles/recap-facts";
import { EMPTY_CELL } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { deals } from "@/lib/i18n/fr/deals";
import { legalParticipations } from "@/lib/i18n/fr/legal-participations";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import {
  followUpIsDue,
  openDealOffer,
} from "@/lib/legal/participation-tracking-rules";
import { isActiveParticipation } from "@/lib/projects/participation-rules";
import type { RecapContract } from "@/lib/projects/recap-rules";
import {
  contractGap,
  isOpenWaiver,
  WAIVER_SCOPES,
  type BoardParticipation,
  type BoardTitle,
  type DealReach,
} from "@/lib/projects/title-board-rules";
import { formatShortDate } from "@/lib/release/format";
import { columnIcons, type ColumnIcon } from "@/lib/ui/column-icons";
import { overdueTone, participationStatusTone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

const fr = { deals, legalParticipations, projectTitles };

const muted = "text-[color:var(--text-tertiary)]";
const PILL_LINK =
  "relative z-10 inline-flex rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]";

// The row's columns from 768 px: the artist, the contract, the deal, « ⋯ ».
export const ROW_GRID = {
  dealsWaive: "md:grid-cols-[minmax(0,1fr)_11rem_12rem_2rem]",
  deals: "md:grid-cols-[minmax(0,1fr)_11rem_12rem]",
  waive: "md:grid-cols-[minmax(0,1fr)_11rem_2rem]",
  none: "md:grid-cols-[minmax(0,1fr)_11rem]",
} as const;

export const rowGrid = (deals: boolean, waive: boolean) =>
  ROW_GRID[deals ? (waive ? "dealsWaive" : "deals") : waive ? "waive" : "none"];

/** The deal's stage in words (the accord de principe says whether it is
 * proposed or validated); null: unknown to the viewer. */
function stageLabel(
  participation: BoardParticipation,
  reach: DealReach,
): string | null {
  const deal = participation.deal;
  if (deal)
    return deal.stage === "agreement" && deal.agreementStatus
      ? fr.deals.agreement[deal.agreementStatus]
      : fr.deals.stages[deal.stage];
  return reach === "all" ? fr.legalParticipations.negotiation.none : null;
}

/** What comes next on the deal, as the Deals page says it: a follow-up
 * whose date has come (flagged), else the next action and its date, else
 * the follow-up to come; null: nothing. */
function nextOf(
  participation: BoardParticipation,
  today: string,
): { text: string; due: boolean } | null {
  const t = fr.deals.table;
  const deal = participation.deal;
  if (!deal) return null;
  if (deal.followUpOn && followUpIsDue(deal, today))
    return { text: t.followUpDue(formatShortDate(deal.followUpOn)), due: true };
  if (deal.nextAction)
    return {
      text: deal.nextActionOn
        ? t.on(deal.nextAction, formatShortDate(deal.nextActionOn))
        : deal.nextAction,
      due: false,
    };
  if (deal.followUpOn && deal.stage !== "signed" && deal.stage !== "abandoned")
    return { text: t.followUpOn(formatShortDate(deal.followUpOn)), due: false };
  return null;
}

/** A column of the row: its concept's icon (named for a screen reader),
 * then what it holds. */
function Cell({
  icon,
  label,
  children,
}: {
  icon: ColumnIcon;
  label: string;
  children: ReactNode;
}) {
  const Icon = columnIcons[icon];
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon
        aria-hidden
        className="mt-0.5 size-4 shrink-0 text-[color:var(--text-tertiary)]"
      />
      <span className="sr-only">{label}</span>
      <div className="flex min-w-0 flex-col items-start gap-1">{children}</div>
    </div>
  );
}

/**
 * One artist of a title, as a fact row (Sacha 27/11/2026, like « Qui fait
 * quoi »): the artist and role (opening the deal when the viewer reads
 * it), the participation's status, the deal's next action and the waivers
 * under them; the contract in the recap's words (opening the contract);
 * the deal's stage and who negotiates it, or « Ouvrir un dossier »; the
 * direction's waivers in « ⋯ ». No contact is shown.
 */
export function ParticipationRow({
  projectId,
  title,
  titleLabel,
  participation,
  contractState,
  dealReach,
  canCreate,
  canWaive,
  negotiators,
  today,
}: {
  projectId: string;
  title: BoardTitle;
  titleLabel: string;
  participation: BoardParticipation;
  contractState: RecapContract;
  dealReach: DealReach;
  canCreate: boolean;
  canWaive: boolean;
  negotiators: Array<{ id: string; name: string }>;
  today: string;
}) {
  const t = fr.legalParticipations;
  const deals = dealReach !== "none";
  const dimmed =
    title.status === "abandoned" ||
    !isActiveParticipation(participation.status);
  const contract = participation.contract;
  const pill = contractStatePill(contractState);
  const stage = stageLabel(participation, dealReach);
  const next = deals ? nextOf(participation, today) : null;
  const deal = participation.deal;
  const offer = openDealOffer({
    canCreate,
    reach: dealReach,
    title,
    participation,
  });
  const artist = participation.artist.name;
  // Lot 12: a confirmed participation of a live title without its contract
  // signed; the direction covers each scope by a waiver, or revokes one.
  const gap = contractGap(title, participation, today);
  const openWaivers = participation.waivers.filter((w) =>
    isOpenWaiver(w, today),
  );
  const grantable = gap ? WAIVER_SCOPES.filter((scope) => !gap[scope]) : [];
  const offerButton = offer && (
    <OpenDealButton
      participationId={participation.id}
      artist={artist}
      title={titleLabel}
      again={offer.again}
      negotiators={negotiators}
    />
  );

  return (
    <div
      className={cn(
        "grid grid-cols-1 items-start gap-x-4 gap-y-2 border-b border-[color:var(--border-hairline)] px-3.5 py-2.75 text-body-sm last:border-b-0",
        rowGrid(deals, canWaive),
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {deal ? (
            <ViewLink
              href={routes.deal(deal.id)}
              className={cn(
                "font-medium underline-offset-4 hover:underline",
                dimmed && "text-[color:var(--text-secondary)]",
              )}
            >
              {artist}
            </ViewLink>
          ) : (
            <span
              className={cn(
                "font-medium",
                dimmed && "text-[color:var(--text-secondary)]",
              )}
            >
              {artist}
            </span>
          )}
          <span className={muted}>
            {fr.projectTitles.participations.roles[participation.role]}
          </span>
          <StatusBadge
            tone={participationStatusTone[participation.status]}
            size="sm"
          >
            {fr.projectTitles.participations.statuses[participation.status]}
          </StatusBadge>
        </span>
        {next &&
          (next.due ? (
            <StatusBadge tone={overdueTone} size="sm">
              {next.text}
            </StatusBadge>
          ) : (
            <span className="line-clamp-2 text-caption break-words text-[color:var(--text-secondary)]">
              {next.text}
            </span>
          ))}
        {!dimmed && (
          <WaiverLines waivers={participation.waivers} today={today} />
        )}
      </div>

      <Cell icon="contract" label={t.columns.contract}>
        {pill && contract.kind === "contract" ? (
          <ViewLink href={routes.contract(contract.id)} className={PILL_LINK}>
            <StatusBadge tone={pill.tone} size="sm">
              {pill.words}
            </StatusBadge>
          </ViewLink>
        ) : pill ? (
          <StatusBadge tone={pill.tone} size="sm">
            {pill.words}
          </StatusBadge>
        ) : (
          <span className={muted}>{EMPTY_CELL}</span>
        )}
      </Cell>

      {deals && (
        <Cell icon="deal" label={t.columns.negotiation}>
          {deal ? (
            <>
              <ViewLink
                href={routes.deal(deal.id)}
                className={PILL_LINK}
                aria-label={t.negotiation.link(artist, stage ?? "")}
              >
                <DealStageBadge deal={deal} />
              </ViewLink>
              <span
                className={cn(
                  "text-caption",
                  deal.assignee ? "text-[color:var(--text-secondary)]" : muted,
                )}
              >
                {deal.assignee
                  ? t.negotiation.by(deal.assignee)
                  : t.negotiation.unassigned}
              </span>
            </>
          ) : (
            <span className={cn("text-caption", muted)}>
              {stage ?? EMPTY_CELL}
            </span>
          )}
          {offerButton}
        </Cell>
      )}

      {canWaive && (
        <div className="flex justify-end">
          {(grantable.length > 0 || openWaivers.length > 0) && !dimmed && (
            <WaiverActions
              projectId={projectId}
              participationId={participation.id}
              artist={artist}
              title={titleLabel}
              open={openWaivers}
              grantable={grantable}
            />
          )}
        </div>
      )}
    </div>
  );
}
