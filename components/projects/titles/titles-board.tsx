"use client";

import {
  IconArrowDottedRotateAnticlockwise,
  IconBoxArchive,
  IconLink,
  IconMicrophone,
  IconMinus,
  IconPenWriting2,
  IconTriangleWarning,
} from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DealStageBadge } from "@/components/deals/deal-stage-badge";
import { IconArrowUpRight, IconDisc, IconUserPlus } from "@/components/icons";
import {
  AddParticipationForm,
  AttachCatalogTitleForm,
  ParticipationStatusForm,
  RenameTitleForm,
  type ArtistChoices,
} from "@/components/projects/titles/title-forms";
import { WaiverLines } from "@/components/legal/waiver-lines";
import { EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { FormDialog } from "@/components/ui/form-dialog";
import { ReasonForm } from "@/components/ui/reason-form";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { contracts } from "@/lib/i18n/fr/contracts";
import { deals } from "@/lib/i18n/fr/deals";
import { demos } from "@/lib/i18n/fr/demos";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { participationWaivers } from "@/lib/i18n/fr/participation-waivers";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import { setTitleParticipationStatus } from "@/lib/projects/participation-actions";
import { isActiveParticipation } from "@/lib/projects/participation-rules";
import {
  abandonProjectTitle,
  reactivateProjectTitle,
  startTitleWork,
} from "@/lib/projects/title-actions";
import {
  contractGap,
  titleMasterLabel,
  titleMasterStatus,
  type BoardParticipation,
  type BoardTitle,
  type DealReach,
  type ParticipationContract,
} from "@/lib/projects/title-board-rules";
import {
  creditModeOf,
  masterNameOf,
  projectTitleLabel,
} from "@/lib/projects/title-rules";
import {
  contractStateTone,
  participationStatusTone,
  projectTitleTone,
  workflowStatusTone,
} from "@/lib/ui/state-tones";
import { todayInParis } from "@/lib/contracts/types";
import { formatShortDay } from "@/lib/utils/day";
import { cn } from "@/lib/utils";

const fr = {
  contracts,
  deals,
  demos,
  dialogs,
  participationWaivers,
  projectTitles,
};

const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]";
const muted = "text-[color:var(--text-tertiary)]";

/** Where a row leads: the project's Master (a title with a master), the
 * project's Distribution (the titles go out with it until lot 15). Null
 * when the project has no such workflow. */
export type BoardLinks = { master: string | null; distribution: string | null };

const labelOf = (title: BoardTitle) =>
  projectTitleLabel({
    position: title.position,
    workingTitle: title.workingTitle,
    masterTitle: masterNameOf(title.master),
  });

/** How a confirmation credits the title (creditModeOf), and the warning of
 * a title a simple project shares (« Crédits à vérifier au Catalogue : ce
 * titre est aussi dans le projet … », décision 10). */
type Credit = { mode: "now" | "later" | "manual"; shared: string };

function creditOf(title: BoardTitle): Credit {
  return {
    mode: creditModeOf(title),
    shared: title.sharedWith
      ? fr.projectTitles.participations.shared(
          title.sharedWith.names,
          title.sharedWith.hidden,
        )
      : "",
  };
}

/** Under the name: why it was abandoned, else where it stands in the
 * Catalogue (its maquette's status when it is one). */
function detailOf(title: BoardTitle, label: string): string {
  const t = fr.projectTitles;
  if (title.status === "abandoned" && title.abandonedAt && title.abandonReason)
    return t.abandonedOn(
      formatShortDay(title.abandonedAt, { bare: true }),
      title.abandonReason,
    );
  if (!title.master) return t.notInCatalog;
  // Lot 7: its title in the Catalogue waits for its name.
  if (title.master.provisional) return t.catalogProvisional(title.master.title);
  const demo = title.master.demoStatus
    ? fr.demos.badge(fr.demos.statuses[title.master.demoStatus])
    : null;
  if (label === title.master.title) return demo ?? t.inCatalog;
  return demo
    ? t.catalogDemo(title.master.title, demo)
    : t.catalog(title.master.title);
}

/** The words of a participation's contract; null: not expected (« — »). */
function contractLabel(contract: ParticipationContract): string | null {
  const t = fr.projectTitles.board.contract;
  switch (contract.kind) {
    case "contract":
      return fr.contracts.states[contract.state];
    case "hidden":
      return t.hidden;
    case "missing":
      return t.missing;
    case "none":
      return null;
  }
}

/** The words of a participation's negotiation, by what the viewer knows of
 * the project's deals (DealReach); null: unknown (« — »). */
function negotiationLabel(
  participation: BoardParticipation,
  reach: DealReach,
): string | null {
  const deal = participation.deal;
  if (deal)
    return deal.stage === "agreement" && deal.agreementStatus
      ? fr.deals.agreement[deal.agreementStatus]
      : fr.deals.stages[deal.stage];
  return reach === "all" ? fr.projectTitles.board.negotiation.none : null;
}

function ownerLabel(
  participation: BoardParticipation,
  reach: DealReach,
): string | null {
  const deal = participation.deal;
  if (deal)
    return deal.assignee ?? fr.projectTitles.board.negotiation.unassigned;
  return reach === "all" ? EMPTY_CELL : null;
}

// The columns (a project's content is 1180 px at most): those of the
// participations, shown from 1280 px; under it, said under the name.
const COLUMN = {
  status: "w-28",
  contract: "w-40",
  negotiation: "w-56",
  owner: "w-32",
} as const;

// The name's cell wraps (the table's cells do not): its lines under the
// name — detail, warning, the hidden columns — never widen the table past
// a phone's screen; the name itself stays on one line (DataTableLink).
const NAME_CELL = "whitespace-normal";

/** Under 1280 px, what the hidden columns say, under the name. */
type HiddenFact = { key: string; label: string; value: string };

function HiddenFacts({ facts }: { facts: HiddenFact[] }) {
  if (facts.length === 0) return null;
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-0.5 xl:hidden">
      {facts.map((fact) => (
        <span key={fact.key} className={caption}>
          {`${fact.label} : `}
          <span className="text-[color:var(--text-secondary)]">
            {fact.value}
          </span>
        </span>
      ))}
    </span>
  );
}

/** A title's facts in the space of its participations' columns: its
 * Master, then its Distribution, each named. */
function TitleFacts({
  master,
  masterStatus,
  distribution,
}: {
  master: string | null;
  masterStatus: ReturnType<typeof titleMasterStatus>;
  distribution: string | null;
}) {
  const t = fr.projectTitles.board;
  return (
    <span className="flex flex-wrap items-center gap-x-6 gap-y-1.5">
      <span className="flex items-center gap-2">
        <span className={caption}>{t.columns.master}</span>
        {master && masterStatus ? (
          <StatusBadge tone={workflowStatusTone[masterStatus]} size="sm">
            {master}
          </StatusBadge>
        ) : (
          <span className={muted}>{EMPTY_CELL}</span>
        )}
      </span>
      <span className="flex items-center gap-2">
        <span className={caption}>{t.columns.distribution}</span>
        {distribution ? (
          <ViewLink
            href={distribution}
            className="relative z-10 text-[color:var(--text-secondary)] hover:underline focus-visible:underline"
          >
            {t.distribution.withProject}
          </ViewLink>
        ) : (
          <span className={muted}>{EMPTY_CELL}</span>
        )}
      </span>
    </span>
  );
}

/**
 * « Titres et artistes » of a collective project (docs/pds-mic-plan.md,
 * lot 6), replacing the minimal list of lots 2 and 3: one DataTable, one row
 * per title and, under it, one row per participation (indented). A title
 * row says its status, where it stands in the Master, and its Distribution
 * (with the project's until lot 15); a participation row its status, its
 * contract, its deal's stage and who negotiates it (Business module, read
 * under its rights: the two columns only when the viewer reads deals). The
 * abandoned titles come last, under « Abandonnés », their artists greyed.
 * A title row opens the project's Master, a participation row its contract.
 * For whoever writes the project, each « ⋯ »: add an artist, rename,
 * abandon or reactivate a title; change the status of a participation,
 * withdraw it (détacher) or bring it back (rattacher). Every state is
 * computed (lib/projects/title-board-rules.ts), never two titles mixed.
 * On a phone: the name and the status; the other columns under the name.
 */
export function TitlesBoard({
  projectId,
  titles,
  dealReach,
  canManage,
  artists,
  masterOptions = {},
  links,
  today = todayInParis(new Date()),
}: {
  projectId: string;
  titles: BoardTitle[];
  dealReach: DealReach;
  canManage: boolean;
  artists: ArtistChoices;
  // The Catalogue's titles not in the project yet (« Rattacher un titre du
  // Catalogue », lot 7): id → « Titre · Artistes ».
  masterOptions?: Record<string, string>;
  links: BoardLinks;
  // Paris's day, read by the server (a waiver's due date, lot 12).
  today?: string;
}) {
  const t = fr.projectTitles.board;
  if (titles.length === 0)
    return (
      <EmptyState
        icon={IconDisc}
        title={t.empty.title}
        body={canManage ? t.empty.body : t.empty.readOnly}
      />
    );

  const deals = dealReach !== "none";
  // Every column, hidden ones included (the group row spans them all).
  const columns = deals ? 6 : 4;
  const live = titles.filter((title) => title.status !== "abandoned");
  const abandoned = titles.filter((title) => title.status === "abandoned");
  const rows = (list: BoardTitle[]) =>
    list.map((title) => (
      <TitleRows
        key={title.id}
        projectId={projectId}
        title={title}
        dealReach={dealReach}
        canManage={canManage}
        artists={artists}
        masterOptions={masterOptions}
        links={links}
        today={today}
      />
    ));

  return (
    <DataTable>
      <DataTableHeader>
        <DataTableHead fill>{t.columns.title}</DataTableHead>
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
          <DataTableHead hideBelow="xl" className={COLUMN.owner}>
            {t.columns.owner}
          </DataTableHead>
        )}
        <DataTableActionsHead label={t.columns.actions} />
      </DataTableHeader>
      <DataTableBody>
        {rows(live)}
        {abandoned.length > 0 && (
          <DataTableGroupRow columns={columns}>
            <span className="text-[length:var(--type-body-md)] font-semibold">
              {t.abandonedGroup}
              <span className="ml-1.5 font-medium text-[color:var(--text-tertiary)]">
                {abandoned.length}
              </span>
            </span>
          </DataTableGroupRow>
        )}
        {rows(abandoned)}
      </DataTableBody>
    </DataTable>
  );
}

type RowProps = {
  projectId: string;
  title: BoardTitle;
  dealReach: DealReach;
  canManage: boolean;
  artists: ArtistChoices;
  masterOptions: Record<string, string>;
  links: BoardLinks;
  today: string;
};

/** A title's rows: its own, then its participations, or « Aucun artiste
 * invité » (with « Ajouter un artiste » for whoever writes). */
function TitleRows(props: RowProps) {
  const { projectId, title, dealReach, canManage, artists } = props;
  const label = labelOf(title);
  const abandoned = title.status === "abandoned";
  const [adding, setAdding] = useState(false);
  const deals = dealReach !== "none";
  const credit = creditOf(title);
  return (
    <>
      <TitleRow {...props} label={label} adding={adding} onAdding={setAdding} />
      {title.participations.map((participation) => (
        <ParticipationRow
          key={participation.id}
          projectId={projectId}
          participation={participation}
          label={label}
          credit={credit}
          dealReach={dealReach}
          today={props.today}
          // Its title abandoned: greyed and not edited (reactivate it first).
          dimmed={abandoned}
          canManage={canManage && !abandoned}
          // Confirmed on a title a simple project shares: its credits were
          // not written, they are to check by hand (décision 10).
          toCheck={
            credit.mode === "manual" &&
            participation.status === "confirmed" &&
            !abandoned
          }
        />
      ))}
      {title.participations.length === 0 && !abandoned && (
        <DataTableRow>
          {/* Over the status column too (no participation, no status):
              the button never widens the table past a phone's screen. */}
          <DataTableCell fill className={NAME_CELL} colSpan={2}>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-2 pl-6">
              <span className={muted}>{fr.projectTitles.board.noArtist}</span>
              {canManage && Object.keys(artists.options).length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAdding(true)}
                >
                  {fr.projectTitles.participations.add.action}
                </Button>
              )}
            </span>
          </DataTableCell>
          <DataTableCell hideBelow="xl" colSpan={deals ? 3 : 1}>
            {null}
          </DataTableCell>
          <DataTableActionsCell>{null}</DataTableActionsCell>
        </DataTableRow>
      )}
    </>
  );
}

function TitleRow({
  projectId,
  title,
  dealReach,
  canManage,
  artists,
  masterOptions,
  links,
  today,
  label,
  adding,
  onAdding,
}: RowProps & {
  label: string;
  adding: boolean;
  onAdding: (open: boolean) => void;
}) {
  const t = fr.projectTitles;
  const abandoned = title.status === "abandoned";
  const deals = dealReach !== "none";
  // An abandoned title is out of the Master (lot 9): no state there.
  const master = abandoned ? null : titleMasterLabel(title.masterState);
  const masterStatus = abandoned ? null : titleMasterStatus(title.masterState);
  const shared =
    title.sharedWith && !abandoned
      ? t.participations.shared(title.sharedWith.names, title.sharedWith.hidden)
      : null;
  // Lot 12: its confirmed artists without their contract signed (the shoot
  // and the release wait for them, or for a waiver).
  const missing = title.participations
    .filter((p) => contractGap(title, p, today) !== null)
    .map((p) => p.artist.name);
  return (
    <DataTableRow>
      <DataTableCell fill className={NAME_CELL}>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span
            className={cn(
              "flex min-w-0 font-semibold",
              abandoned && "text-[color:var(--text-secondary)]",
            )}
          >
            {/* The title's Master, once it has a master, open on this
                title (lot 8); an abandoned title is out of it (lot 9). */}
            <DataTableLink
              href={
                title.master && links.master && !abandoned
                  ? `${links.master}?titre=${title.master.id}`
                  : null
              }
            >
              {label}
            </DataTableLink>
          </span>
          {/* Wraps rather than cut: on a phone « Maquette · En
              développement » lost its status. */}
          <span
            className={cn(caption, "line-clamp-2 break-words")}
            // The whole reason of an abandonment, when two lines cut it.
            title={abandoned ? (title.abandonReason ?? undefined) : undefined}
          >
            {detailOf(title, label)}
          </span>
          {/* A simple project shares its master: no automatic credit,
              said where the title is (décision 10). */}
          {shared && (
            <span
              className={cn(
                caption,
                "flex items-start gap-1.5 text-[color:var(--tone-warning-fg)]",
              )}
            >
              <IconTriangleWarning
                aria-hidden
                className="mt-0.5 size-4 shrink-0"
              />
              {`${shared}.`}
            </span>
          )}
          {missing.length > 0 && (
            <span
              className={cn(
                caption,
                "flex items-start gap-1.5 text-[color:var(--tone-warning-fg)]",
              )}
            >
              <IconTriangleWarning
                aria-hidden
                className="mt-0.5 size-4 shrink-0"
              />
              {fr.participationWaivers.titleMissing(missing.join(", "))}
            </span>
          )}
          <HiddenFacts
            facts={
              master
                ? [
                    {
                      key: "master",
                      label: t.board.caption.master,
                      value: master,
                    },
                  ]
                : []
            }
          />
        </span>
      </DataTableCell>
      <DataTableCell className={COLUMN.status}>
        <StatusBadge tone={projectTitleTone[title.status]} size="sm">
          {t.statuses[title.status]}
        </StatusBadge>
      </DataTableCell>
      {/* A title has no contract nor deal: its own facts in their space. */}
      <DataTableCell hideBelow="xl" colSpan={deals ? 3 : 1}>
        <TitleFacts
          master={master}
          masterStatus={masterStatus}
          distribution={links.distribution}
        />
      </DataTableCell>
      <DataTableActionsCell>
        <TitleActions
          projectId={projectId}
          title={title}
          label={label}
          artists={artists}
          masterOptions={masterOptions}
          canManage={canManage}
          adding={adding}
          onAdding={onAdding}
        />
      </DataTableActionsCell>
    </DataTableRow>
  );
}

/** An artist on a title, indented under it: name and role, status,
 * contract, negotiation and who negotiates. */
function ParticipationRow({
  projectId,
  participation,
  label,
  credit,
  dealReach,
  today,
  dimmed,
  canManage,
  toCheck,
}: {
  projectId: string;
  participation: BoardParticipation;
  label: string;
  credit: Credit;
  dealReach: DealReach;
  today: string;
  dimmed: boolean;
  canManage: boolean;
  toCheck: boolean;
}) {
  const t = fr.projectTitles;
  const deals = dealReach !== "none";
  const active = isActiveParticipation(participation.status) && !dimmed;
  const contract = participation.contract;
  const contractWords = contractLabel(contract);
  const negotiation = negotiationLabel(participation, dealReach);
  const owner = ownerLabel(participation, dealReach);
  const deal = participation.deal;
  const hidden: HiddenFact[] = [
    ...(contractWords
      ? [
          {
            key: "contract",
            label: t.board.caption.contract,
            value: contractWords,
          },
        ]
      : []),
    ...(deals && negotiation
      ? [
          {
            key: "negotiation",
            label: t.board.caption.negotiation,
            // Who negotiates, with it.
            value:
              deal && owner && owner !== EMPTY_CELL
                ? `${negotiation} · ${owner}`
                : negotiation,
          },
        ]
      : []),
  ];
  return (
    <DataTableRow>
      <DataTableCell fill className={NAME_CELL}>
        {/* Indented under its title (the row's inset holds the cell's own
            padding). */}
        <span className="flex min-w-0 flex-col gap-0.5 pl-6">
          {/* The role goes under the name when the line is too short (a
              phone), rather than cutting the name. */}
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-1">
            {/* The participation's contract, in the Juridique, when the
                viewer reads it. */}
            <span
              className={cn(
                "flex min-w-0",
                !active && "text-[color:var(--text-secondary)]",
              )}
            >
              <DataTableLink
                href={
                  contract.kind === "contract"
                    ? routes.contract(contract.id)
                    : null
                }
              >
                {participation.artist.name}
              </DataTableLink>
            </span>
            <span className={cn(muted, "hidden shrink-0 sm:inline")}>
              {`· ${t.participations.roles[participation.role]}`}
            </span>
          </span>
          {/* On a phone, the role under the name. */}
          <span className={cn(caption, "sm:hidden")}>
            {t.participations.roles[participation.role]}
          </span>
          {toCheck && (
            <span className={cn(caption, "flex items-start gap-1.5")}>
              <IconTriangleWarning
                aria-hidden
                className="mt-0.5 size-4 shrink-0"
              />
              {t.participations.sharedShort}
            </span>
          )}
          {!dimmed && (
            <WaiverLines waivers={participation.waivers} today={today} />
          )}
          <HiddenFacts facts={hidden} />
        </span>
      </DataTableCell>
      <DataTableCell className={COLUMN.status}>
        <StatusBadge
          tone={participationStatusTone[participation.status]}
          size="sm"
        >
          {t.participations.statuses[participation.status]}
        </StatusBadge>
      </DataTableCell>
      <DataTableCell hideBelow="xl" className={COLUMN.contract}>
        {contract.kind === "contract" ? (
          <StatusBadge tone={contractStateTone[contract.state]} size="sm">
            {contractWords}
          </StatusBadge>
        ) : contract.kind === "missing" ? (
          <StatusBadge tone="warning" size="sm">
            {contractWords}
          </StatusBadge>
        ) : contract.kind === "hidden" ? (
          <StatusBadge tone="neutral" size="sm">
            {contractWords}
          </StatusBadge>
        ) : (
          <span className={muted}>{EMPTY_CELL}</span>
        )}
      </DataTableCell>
      {deals && (
        <DataTableCell hideBelow="xl" className={COLUMN.negotiation}>
          {deal ? (
            <ViewLink
              href={routes.deal(deal.id)}
              className="relative z-10 inline-flex rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]"
              // Who and where, never « Négociation : Négociation ».
              aria-label={t.board.negotiation.link(
                participation.artist.name,
                negotiation ?? "",
              )}
            >
              <DealStageBadge deal={deal} />
            </ViewLink>
          ) : (
            <span className={muted}>{negotiation ?? EMPTY_CELL}</span>
          )}
        </DataTableCell>
      )}
      {deals && (
        <DataTableCell hideBelow="xl" className={COLUMN.owner}>
          <span
            className={cn("line-clamp-2 break-words", !deal?.assignee && muted)}
          >
            {owner ?? EMPTY_CELL}
          </span>
        </DataTableCell>
      )}
      <DataTableActionsCell>
        {canManage && (
          <ParticipationActions
            projectId={projectId}
            participation={participation}
            label={label}
            credit={credit}
          />
        )}
      </DataTableActionsCell>
    </DataTableRow>
  );
}

/** « ⋯ » of a title: add an artist, rename and abandon in a modal (a
 * gesture that asks a saisie opens one), reactivate at once (nothing to
 * ask); its page in the Catalogue for everyone, once it has a master. */
function TitleActions({
  projectId,
  title,
  label,
  artists,
  masterOptions,
  canManage,
  adding,
  onAdding,
}: {
  projectId: string;
  title: BoardTitle;
  label: string;
  artists: ArtistChoices;
  masterOptions: Record<string, string>;
  canManage: boolean;
  adding: boolean;
  onAdding: (open: boolean) => void;
}) {
  const t = fr.projectTitles;
  const router = useRouter();
  const credit = creditOf(title);
  const [open, setOpen] = useState<"rename" | "abandon" | "attach" | null>(
    null,
  );
  const [, startTransition] = useTransition();
  const close = () => setOpen(null);
  const catalog: RowAction[] = title.master
    ? [
        {
          key: "catalog",
          label: t.openCatalog,
          icon: IconArrowUpRight,
          onSelect: () => router.push(routes.master(title.master!.id)),
        },
      ]
    : [];
  // Lot 7: a title not in the Catalogue yet gets its title there,
  // provisional, at its first audio; or takes one the Catalogue has.
  const start: RowAction[] = title.master
    ? []
    : [
        {
          key: "audio",
          label: t.catalogStart.action,
          icon: IconMicrophone,
          onSelect: () =>
            startTransition(async () => {
              const result = await startTitleWork({
                projectId,
                titleId: title.id,
              });
              if (!result.ok) return void toast.error(result.error);
              toast.success(t.catalogStart.done);
              router.push(routes.masterAudio(result.masterId));
            }),
        },
        {
          key: "attach",
          label: t.catalogAttach.action,
          icon: IconLink,
          onSelect: () => setOpen("attach"),
        },
      ];

  const actions: RowAction[] = !canManage
    ? catalog
    : title.status === "abandoned"
      ? [
          {
            key: "reactivate",
            label: t.reactivate.action,
            icon: IconArrowDottedRotateAnticlockwise,
            onSelect: () =>
              startTransition(async () => {
                const result = await reactivateProjectTitle({
                  projectId,
                  titleId: title.id,
                });
                if (!result.ok) return void toast.error(result.error);
                toast.success(t.reactivate.done);
              }),
          },
          ...catalog,
        ]
      : [
          {
            key: "artist",
            label: t.participations.add.action,
            icon: IconUserPlus,
            onSelect: () => onAdding(true),
          },
          {
            key: "rename",
            label: t.rename.action,
            icon: IconPenWriting2,
            onSelect: () => setOpen("rename"),
          },
          ...start,
          ...catalog,
          {
            key: "abandon",
            label: t.abandon.action,
            icon: IconBoxArchive,
            onSelect: () => setOpen("abandon"),
          },
        ];

  return (
    <>
      <RowActions label={t.menu(label)} actions={actions} />
      {canManage && (
        <>
          <FormDialog
            open={adding}
            onOpenChange={(next) => !next && onAdding(false)}
            title={t.participations.add.title(label)}
            description={t.participations.add.description(
              artists.mainArtistId
                ? (artists.options[artists.mainArtistId] ?? null)
                : null,
              credit.mode,
              credit.shared,
            )}
            closeLabel={fr.dialogs.close}
          >
            <AddParticipationForm
              projectId={projectId}
              title={title}
              artists={artists}
              onDone={() => onAdding(false)}
            />
          </FormDialog>
          <FormDialog
            open={open === "rename"}
            onOpenChange={(next) => !next && close()}
            title={t.rename.title}
            description={
              title.master?.provisional
                ? t.rename.descriptionProvisional
                : t.rename.description
            }
            closeLabel={fr.dialogs.close}
          >
            <RenameTitleForm
              projectId={projectId}
              title={title}
              onDone={close}
            />
          </FormDialog>
          {!title.master && (
            <FormDialog
              open={open === "attach"}
              onOpenChange={(next) => !next && close()}
              title={t.catalogAttach.title(label)}
              description={t.catalogAttach.description}
              closeLabel={fr.dialogs.close}
            >
              <AttachCatalogTitleForm
                projectId={projectId}
                titleId={title.id}
                masterOptions={masterOptions}
                onDone={close}
              />
            </FormDialog>
          )}
          <FormDialog
            open={open === "abandon"}
            onOpenChange={(next) => !next && close()}
            title={t.abandon.title(label)}
            // Only a maquette in draft or in development becomes
            // « abandonnée »; a validated one keeps its status (décision 8).
            description={
              title.master?.demoStatus === "draft" ||
              title.master?.demoStatus === "developing"
                ? `${t.abandon.description} ${t.abandon.demoNote}`
                : t.abandon.description
            }
            closeLabel={fr.dialogs.close}
          >
            <ReasonForm
              label={t.abandon.reason}
              submitLabel={t.abandon.submit}
              doneMessage={t.abandon.done}
              run={(reason) =>
                abandonProjectTitle({ projectId, titleId: title.id, reason })
              }
              onDone={close}
            />
          </FormDialog>
        </>
      )}
    </>
  );
}

/** « ⋯ » of an artist on a title: change its status (modal), withdraw it
 * from the title (détacher, confirmed) or bring a declined or withdrawn
 * one back (rattacher, at once, proposed again). */
function ParticipationActions({
  projectId,
  participation,
  label,
  credit,
}: {
  projectId: string;
  participation: BoardParticipation;
  label: string;
  credit: Credit;
}) {
  const t = fr.projectTitles.participations;
  const [open, setOpen] = useState<"status" | "withdraw" | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setOpen(null);
    setError(null);
  };
  const setStatus = (status: "withdrawn" | "proposed", done: string) =>
    startTransition(async () => {
      const result = await setTitleParticipationStatus({
        projectId,
        participationId: participation.id,
        status,
      });
      if (!result.ok) {
        if (status === "withdrawn") return void setError(result.error);
        return void toast.error(result.error);
      }
      // A credit written on the way is said by the action's own message;
      // the period added as usePublishResult does.
      toast.success(`${status === "proposed" ? done : (result.done ?? done)}.`);
      close();
    });
  const active = isActiveParticipation(participation.status);

  return (
    <>
      <RowActions
        label={t.menu(participation.artist.name, label)}
        actions={[
          {
            key: "status",
            label: t.status.action,
            icon: IconPenWriting2,
            onSelect: () => setOpen("status"),
          },
          active
            ? {
                key: "withdraw",
                label: t.withdraw.action,
                icon: IconMinus,
                onSelect: () => setOpen("withdraw"),
              }
            : {
                key: "reattach",
                label: t.reattach.action,
                icon: IconUserPlus,
                onSelect: () => setStatus("proposed", t.reattach.done),
              },
        ]}
      />
      <FormDialog
        open={open === "status"}
        onOpenChange={(next) => !next && close()}
        title={t.status.title(participation.artist.name, label)}
        description={t.status.description(credit.mode, credit.shared)}
        closeLabel={fr.dialogs.close}
      >
        <ParticipationStatusForm
          projectId={projectId}
          participation={participation}
          onDone={close}
        />
      </FormDialog>
      <ConfirmDialog
        open={open === "withdraw"}
        onOpenChange={(next) => !next && close()}
        title={t.withdraw.title(participation.artist.name, label)}
        description={t.withdraw.description}
        cancelLabel={fr.dialogs.cancel}
        closeLabel={fr.dialogs.close}
        confirmLabel={t.withdraw.submit}
        pendingLabel={t.withdraw.pending}
        pending={pending}
        error={error}
        onConfirm={() => setStatus("withdrawn", t.withdraw.done)}
      />
    </>
  );
}
