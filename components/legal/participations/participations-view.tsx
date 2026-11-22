"use client";

import { DealStageBadge } from "@/components/deals/deal-stage-badge";
import { IconUserPlus } from "@/components/icons";
import { OpenDealButton } from "@/components/legal/participations/open-deal-button";
import { contractStatePill } from "@/components/projects/titles/recap-facts";
import { WaiverActions } from "@/components/legal/participations/waiver-actions";
import { WaiverLines } from "@/components/legal/waiver-lines";
import { EmptyState } from "@/components/shell/empty-state";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableGroupRow,
  DataTableHead,
  DataTableHeader,
  DataTableLink,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
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
import {
  contractGap,
  isOpenWaiver,
  WAIVER_SCOPES,
  type BoardParticipation,
  type BoardTitle,
  type DealReach,
} from "@/lib/projects/title-board-rules";
import type { RecapContract } from "@/lib/projects/recap-rules";
import {
  masterNameOf,
  projectTitleLabel,
  titleGuestNames,
} from "@/lib/projects/title-rules";
import { formatShortDate } from "@/lib/release/format";
import {
  overdueTone,
  participationStatusTone,
  projectTitleTone,
} from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";

const fr = { deals, legalParticipations, projectTitles };

const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]";
const muted = "text-[color:var(--text-tertiary)]";

// A project's content is 1180 px at most: four columns beside the name,
// shown from 1280 px; under it, said under the name.
const COLUMN = {
  status: "w-28",
  contract: "w-40",
  negotiation: "w-56",
  nextAction: "w-56",
} as const;

const labelOf = (title: BoardTitle) =>
  projectTitleLabel({
    position: title.position,
    workingTitle: title.workingTitle,
    masterTitle: masterNameOf(title.master),
    artists: titleGuestNames(title.participations),
  });

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

/**
 * « Participations et contrats » of a collective's Juridique (lot 11): one
 * group per title (the project's order), one row per participation — the
 * artist and role, the participation's status, its contract (in the
 * recap's words, contractStatePill), its deal's stage and who negotiates it, the deal's
 * next action. A row opens its deal (Business module) when the viewer reads
 * it; the contract's pill opens the contract. Without a live deal, « Ouvrir
 * un dossier » for whoever may create one (create_deal). The same artist on
 * two titles: two rows and two deals, one contract (the person's). No
 * contact is shown.
 */
export function ParticipationsView({
  projectId,
  titles,
  dealReach,
  contracts,
  canCreate,
  canWaive,
  negotiators,
  today,
}: {
  projectId: string;
  titles: BoardTitle[];
  dealReach: DealReach;
  // Each participation's contract in the recap's words, by id.
  contracts: Record<string, RecapContract>;
  canCreate: boolean;
  // The direction (« validate »): grants and revokes waivers (lot 12).
  canWaive: boolean;
  negotiators: Array<{ id: string; name: string }>;
  today: string;
}) {
  const t = fr.legalParticipations;
  if (titles.every((title) => title.participations.length === 0))
    return (
      <EmptyState
        icon={IconUserPlus}
        title={t.empty.title}
        body={t.empty.body}
        action={
          <ViewLink
            href={routes.projectTitles(projectId)}
            className="text-sm font-medium underline-offset-4 hover:underline"
          >
            {t.empty.link}
          </ViewLink>
        }
      />
    );
  const deals = dealReach !== "none";
  // Every column, hidden ones included (the group row spans them all).
  const columns = (deals ? 5 : 3) + (canWaive ? 1 : 0);
  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.columns.artist}</DataTableHead>
        <DataTableHead className={COLUMN.status}>
          {t.columns.status}
        </DataTableHead>
        <DataTableHead hideBelow="xl" className={COLUMN.contract}>
          {t.columns.contract}
        </DataTableHead>
        {deals && (
          <DataTableHead hideBelow="xl" className={COLUMN.negotiation}>
            {t.columns.negotiation}
          </DataTableHead>
        )}
        {deals && (
          <DataTableHead hideBelow="xl" className={COLUMN.nextAction}>
            {t.columns.nextAction}
          </DataTableHead>
        )}
        {canWaive && <DataTableActionsHead label={t.columns.actions} />}
      </DataTableHeader>
      <DataTableBody>
        {titles.map((title) => {
          const label = labelOf(title);
          return [
            <DataTableGroupRow key={`${title.id}-group`} columns={columns}>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[length:var(--type-body-md)] font-semibold">
                  {label}
                </span>
                {title.status !== "active" && (
                  <StatusBadge tone={projectTitleTone[title.status]} size="sm">
                    {t.titleStatus[title.status]}
                  </StatusBadge>
                )}
              </span>
            </DataTableGroupRow>,
            ...(title.participations.length === 0
              ? [
                  <DataTableRow key={`${title.id}-none`}>
                    <DataTableCell colSpan={columns}>
                      <span className={cn(muted, "font-normal")}>
                        {t.noParticipation}
                      </span>
                    </DataTableCell>
                  </DataTableRow>,
                ]
              : title.participations.map((participation) => (
                  <ParticipationRow
                    key={participation.id}
                    title={title}
                    titleLabel={label}
                    participation={participation}
                    contractState={
                      contracts[participation.id] ?? { kind: "none" }
                    }
                    dealReach={dealReach}
                    projectId={projectId}
                    canCreate={canCreate}
                    canWaive={canWaive}
                    negotiators={negotiators}
                    today={today}
                  />
                ))),
          ];
        })}
      </DataTableBody>
    </DataTable>
  );
}

function ParticipationRow({
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
  canWaive: boolean;
  title: BoardTitle;
  titleLabel: string;
  participation: BoardParticipation;
  contractState: RecapContract;
  dealReach: DealReach;
  canCreate: boolean;
  negotiators: Array<{ id: string; name: string }>;
  today: string;
}) {
  const t = fr.legalParticipations;
  const deals = dealReach !== "none";
  const dimmed =
    title.status === "abandoned" ||
    !isActiveParticipation(participation.status);
  const contract = participation.contract;
  // The same words and tone as the recap's (« Envoyé · en attente de
  // retour », « À rédiger », « En attente de l'accord »…).
  const pill = contractStatePill(contractState);
  const contractWords = pill?.words ?? null;
  const stage = stageLabel(participation, dealReach);
  const next = nextOf(participation, today);
  const deal = participation.deal;
  const offer = openDealOffer({
    canCreate,
    reach: dealReach,
    title,
    participation,
  });
  const who = deal
    ? deal.assignee
      ? t.negotiation.by(deal.assignee)
      : t.negotiation.unassigned
    : null;
  const artist = participation.artist.name;
  // Lot 12: a confirmed participation of a live title without its contract
  // signed; the direction covers each scope by a waiver, or revokes one.
  const gap = contractGap(title, participation, today);
  const openWaivers = participation.waivers.filter((w) =>
    isOpenWaiver(w, today),
  );
  const grantable = gap ? WAIVER_SCOPES.filter((scope) => !gap[scope]) : [];
  const waiverLines = !dimmed && (
    <WaiverLines waivers={participation.waivers} today={today} />
  );
  return (
    <DataTableRow>
      <DataTableCell fill className="whitespace-normal">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-1">
            <span
              className={cn(
                "flex min-w-0",
                dimmed && "text-[color:var(--text-secondary)]",
              )}
            >
              <DataTableLink href={deal ? routes.deal(deal.id) : null}>
                {artist}
              </DataTableLink>
            </span>
            <span className={cn(muted, "shrink-0")}>
              {`· ${fr.projectTitles.participations.roles[participation.role]}`}
            </span>
          </span>
          {/* Under 1280 px: the hidden columns, under the name. */}
          <span className="flex flex-col gap-0.5 xl:hidden">
            {contractWords && (
              <span className={caption}>
                {`${t.caption.contract} : `}
                <span className="text-[color:var(--text-secondary)]">
                  {contractWords}
                </span>
              </span>
            )}
            {waiverLines}
            {deals && stage && (
              <span className={caption}>
                {`${t.caption.negotiation} : `}
                <span className="text-[color:var(--text-secondary)]">
                  {who ? `${stage} · ${who}` : stage}
                </span>
              </span>
            )}
            {deals && next && (
              <span className={caption}>
                {`${t.caption.nextAction} : `}
                <span className="text-[color:var(--text-secondary)]">
                  {next.text}
                </span>
              </span>
            )}
            {offer && (
              <span className="pt-1">
                <OpenDealButton
                  participationId={participation.id}
                  artist={artist}
                  title={titleLabel}
                  again={offer.again}
                  negotiators={negotiators}
                />
              </span>
            )}
          </span>
        </span>
      </DataTableCell>
      <DataTableCell className={COLUMN.status}>
        <StatusBadge
          tone={participationStatusTone[participation.status]}
          size="sm"
        >
          {fr.projectTitles.participations.statuses[participation.status]}
        </StatusBadge>
      </DataTableCell>
      <DataTableCell
        hideBelow="xl"
        className={cn(COLUMN.contract, "whitespace-normal")}
      >
        <span className="flex flex-col items-start gap-1">
          {pill && contract.kind === "contract" ? (
            <ViewLink
              href={routes.contract(contract.id)}
              className="relative z-10 inline-flex rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]"
            >
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
          {waiverLines}
        </span>
      </DataTableCell>
      {deals && (
        <DataTableCell
          hideBelow="xl"
          className={cn(COLUMN.negotiation, "whitespace-normal")}
        >
          {deal ? (
            <span className="flex flex-col items-start gap-1">
              <ViewLink
                href={routes.deal(deal.id)}
                className="relative z-10 inline-flex rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]"
                aria-label={t.negotiation.link(artist, stage ?? "")}
              >
                <DealStageBadge deal={deal} />
              </ViewLink>
              <span
                className={cn(
                  "text-[length:var(--type-body-sm)] font-normal",
                  deal.assignee ? "text-[color:var(--text-secondary)]" : muted,
                )}
              >
                {who}
              </span>
              {offer && (
                <OpenDealButton
                  participationId={participation.id}
                  artist={artist}
                  title={titleLabel}
                  again={offer.again}
                  negotiators={negotiators}
                />
              )}
            </span>
          ) : (
            <span className="flex flex-col items-start gap-1.5">
              <span
                className={cn(
                  "text-[length:var(--type-body-sm)] font-normal",
                  muted,
                )}
              >
                {stage ?? EMPTY_CELL}
              </span>
              {offer && (
                <OpenDealButton
                  participationId={participation.id}
                  artist={artist}
                  title={titleLabel}
                  again={offer.again}
                  negotiators={negotiators}
                />
              )}
            </span>
          )}
        </DataTableCell>
      )}
      {deals && (
        <DataTableCell
          hideBelow="xl"
          className={cn(COLUMN.nextAction, "whitespace-normal")}
        >
          {next?.due ? (
            <StatusBadge tone={overdueTone} size="sm">
              {next.text}
            </StatusBadge>
          ) : next ? (
            <span className="line-clamp-3 text-[length:var(--type-body-sm)] font-normal break-words text-[color:var(--text-secondary)]">
              {next.text}
            </span>
          ) : (
            <span className={muted}>{EMPTY_CELL}</span>
          )}
        </DataTableCell>
      )}
      {canWaive && (
        <DataTableActionsCell>
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
        </DataTableActionsCell>
      )}
    </DataTableRow>
  );
}
