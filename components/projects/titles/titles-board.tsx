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
import {
  Fragment,
  useOptimistic,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { IconArrowUpRight, IconDisc, IconUserPlus } from "@/components/icons";
import {
  ContactFacts,
  NoteLine,
  PlanCallButton,
  ReleaseChoice,
  plansCall,
  releaseValueOf,
  type ReleaseValue,
} from "@/components/projects/titles/recap-edits";
import {
  AccordFacts,
  ContactStatePill,
  FichePill,
  LegalFacts,
  MixPill,
  PILL_LINK,
  caption,
  muted,
} from "@/components/projects/titles/recap-facts";
import {
  AddParticipationForm,
  AttachCatalogTitleForm,
  ParticipationStatusForm,
  RenameTitleForm,
  type ArtistChoices,
} from "@/components/projects/titles/title-forms";
import { WaiverLines } from "@/components/legal/waiver-lines";
import { EmptyNote, EmptyState } from "@/components/shell/empty-state";
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
  EMPTY_CELL,
  ROW_INSET,
} from "@/components/ui/data-table";
import { FilterChip } from "@/components/ui/filter-chip";
import { FormDialog } from "@/components/ui/form-dialog";
import { ReasonForm } from "@/components/ui/reason-form";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { todayInParis } from "@/lib/contracts/types";
import type { SharedNegotiationCall } from "@/lib/deals/negotiation-call-rules";
import { demos } from "@/lib/i18n/fr/demos";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { participationWaivers } from "@/lib/i18n/fr/participation-waivers";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import { setTitleParticipationStatus } from "@/lib/projects/participation-actions";
import { isActiveParticipation } from "@/lib/projects/participation-rules";
import {
  CONTACT_STATES,
  type ContactState,
  type RecapParticipation,
  type RecapTitle,
  type TitleRecap,
} from "@/lib/projects/recap-rules";
import {
  abandonProjectTitle,
  reactivateProjectTitle,
  setTitleRelease,
  startTitleWork,
} from "@/lib/projects/title-actions";
import { contractGap, titleMixFact } from "@/lib/projects/title-board-rules";
import { creditModeOf, masterNameOf } from "@/lib/projects/title-rules";
import { projectTitleTone, type Tone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";
import { formatShortDay } from "@/lib/utils/day";

const fr = {
  demos,
  dialogs,
  participationWaivers,
  projectTitles,
};

/** Where a row leads: the project's Master (a title with a master), its
 * release's deposit in the Distribution (lot 15, by title: its own release,
 * else the compilation's). Null when the project has no such workflow. */
export type TitleDepositLink = { href: string; label: string; tone: Tone };
export type BoardLinks = {
  master: string | null;
  distribution: Record<string, TitleDepositLink> | null;
};

/** Which artists' columns the table has: Artiste and Statut always; Accord
 * when the reader sees deals (dealReach, lot 6); Juridique with
 * manage_legal; « ⋯ » of the artists for whoever writes the titles (none
 * for a reader: no empty column on the right). */
type Columns = { accord: boolean; legal: boolean; actions: boolean };

// The artists' columns at full width (Artiste, Statut, Accord, Juridique).
const dataColumnCount = (columns: Columns) =>
  2 + Number(columns.accord) + Number(columns.legal);

/** How a confirmation credits the title (creditModeOf), and the warning of
 * a title a simple project shares (« Crédits à vérifier au Catalogue : ce
 * titre est aussi dans le projet … », décision 10). */
type Credit = { mode: "now" | "later" | "manual"; shared: string };

function creditOf(title: RecapTitle): Credit {
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

/** A title without a name of its own (its label says its guests). */
const isUnnamed = (title: RecapTitle) =>
  !title.workingTitle && !masterNameOf(title.master);

/** Under the name: why it was abandoned, else where it stands in the
 * Catalogue (its maquette's status when it is one); the number first for a
 * title still to name (two « Titre de Jay (à nommer) » stay apart). */
function detailOf(title: RecapTitle, label: string): string {
  const t = fr.projectTitles;
  if (title.status === "abandoned" && title.abandonedAt && title.abandonReason)
    return t.abandonedOn(
      formatShortDay(title.abandonedAt, { bare: true }),
      title.abandonReason,
    );
  const number = isUnnamed(title) ? `${t.number(title.position)} · ` : "";
  if (!title.master) return `${number}${t.notInCatalog}`;
  // Lot 7: its title in the Catalogue waits for its name.
  if (title.master.provisional)
    return `${number}${t.catalogProvisional(title.master.title)}`;
  const demo = title.master.demoStatus
    ? fr.demos.badge(fr.demos.statuses[title.master.demoStatus])
    : null;
  if (label === title.master.title) return demo ?? t.inCatalog;
  return demo
    ? t.catalogDemo(title.master.title, demo)
    : t.catalog(title.master.title);
}

/** The title's Master, open on this title (lot 8), once it has a master; an
 * abandoned title is out of it (lot 9). */
const masterHrefOf = (title: RecapTitle, links: BoardLinks) =>
  title.master && links.master && title.status !== "abandoned"
    ? `${links.master}?titre=${title.master.id}`
    : null;

// The table's tiers, read on its own width (`@container` on its frame), not
// the window's: what a 1280 px window leaves it depends on the sidebars
// (932 px with both, the main one folded to icons; 782 with it open). Fixed
// columns: Titre 248, Statut 128, Accord 176, Juridique 176, « ⋯ » 48;
// Artiste takes the rest, never under 200 while the title's cell is merged.
// - From 976 px, every column (776 fixed): Artiste 200 at 976, 404 in a
//   project's 1180 (a window from 1528 px).
// - From 624 px, Titre, Artiste, Statut (424 fixed): Artiste 200 at 624,
//   508 in the 932 of a 1280 px window with both sidebars; Accord and
//   Juridique under the name (still links and buttons).
// - Under 624 (a phone, a tablet beside the sidebars): no merged cell; the
//   title's own row across the table, then its artists, their status under
//   the name too.
// Every row has as many visible cells as the header at each tier, « ⋯ » of
// an artist always last: a colSpan being the same at every width, a cell
// whose span changes is written once per tier (the row « Aucun artiste »).
// `min-w-*`: the artist's `w-full` would otherwise squeeze the fixed
// columns to their longest word. The cells wrap (their pills too,
// recap-facts): nothing widens a column, the table never scrolls sideways.
// Literal classes: Tailwind only generates what it reads in full.
const TIER = {
  // The title's merged cell, Statut: from 624 px.
  merged: "hidden @min-[624px]:table-cell",
  // Accord, Juridique: from 976 px.
  full: "hidden @min-[976px]:table-cell",
  // From 624 to 976 px only.
  between: "hidden @min-[624px]:table-cell @min-[976px]:hidden",
  // Under 624 px only: the title's own row, a cell.
  stacked: "@min-[624px]:hidden",
} as const;

const COLUMN = {
  title: "w-62 min-w-62",
  status: "w-32 min-w-32",
  accord: "w-44 min-w-44 whitespace-normal",
  legal: "w-44 min-w-44 whitespace-normal",
} as const;

// The artist's cell takes what the fixed columns leave (`max-w-0` with
// `w-full`: its content cut or wrapped, never pushing the table wider than
// its frame). 16 px from the edge or from the title's cell, at every tier:
// the row's inset (ROW_INSET) only reaches the first cell of a row, which is
// the title's in the first row of a group and the artist's in the others.
const ARTIST_CELL = "w-full max-w-0 whitespace-normal pl-4";

// The title's cell: a block on the soft ground, its facts stacked, from the
// top of its artists' rows.
const TITLE_CELL = "whitespace-normal align-top bg-[var(--surface-soft)]";

// A row of the board. Not DataTableRow: no link covers a row here (the
// title's cell, in the first row of its group, spans the others, which a
// covering link would lie over), so nothing lights up under the pointer and
// no row is made a containing block. Every title in one body: the table's
// own hairline (DataTableBody) sets two titles apart, at the top of a
// group's first artist row (`data-lead`) from 624 px, where the title's own
// row above it is hidden; under 624 px that row carries it and the first
// artist row has none (the soft ground of the title already sets it apart).
// None under the header (`data-first`).
const ROW = cn(
  "border-0 hover:bg-transparent has-aria-expanded:bg-transparent @max-[624px]:[&[data-lead]>*]:border-t-0 [&[data-first]>*]:border-t-0",
  ROW_INSET,
);

function Row({
  lead = false,
  first = false,
  className,
  children,
}: {
  lead?: boolean;
  // The first title's first artist row: no hairline under the header.
  first?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <TableRow
      data-lead={lead ? "" : undefined}
      data-first={lead && first ? "" : undefined}
      className={cn(ROW, className)}
    >
      {children}
    </TableRow>
  );
}

// A name that opens its page (the title's Master, the artist's démarche):
// the link is the name itself.
const NAME_LINK =
  "rounded-sm outline-none hover:underline focus-visible:underline";

/** Under the name, a column folded there: its label, its facts (still
 * links and buttons). */
function StackedFact({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <span className={caption}>{label}</span>
      {children}
    </span>
  );
}

/**
 * « Titres et artistes » of a collective project, read as the team's Excel
 * (retours d'Ibé du 18/11/2026, lot 2; lot 6 of docs/pds-mic-plan.md): one
 * DataTable, one group per title, « Titre à gauche » — the title's cell on
 * the left over all its artists' rows (its label and status, « Nommer »
 * while it has no name, its place in the Catalogue, then Mix, Beatmaker,
 * Sortie, Distribution, one under the other; its « ⋯ » at the top right),
 * then one row per artist, every column aligned: Artiste (name and role,
 * note, contact: number, « Appeler », « WhatsApp »), Statut (« À contacter
 * », « Contacté », « D'accord »), Accord (deal, rate, call; « Caler le call
 * »), Juridique (fiche, contract). Space between two groups, no rule. « Le
 * tableau lit, les modules font »: each name and pill leads to its module;
 * only the contact, the release and the note are edited here. Counters on
 * top filter the artists by status. The abandoned titles come last, under «
 * Abandonnés ». For whoever writes the project, each « ⋯ » as in lot 6.
 * Narrower, Accord and Juridique under the artist's name, then the title on
 * its own row (TIER).
 */
export function TitlesBoard({
  projectId,
  recap,
  canManage,
  artists,
  masterOptions = {},
  links,
  today = todayInParis(new Date()),
}: {
  projectId: string;
  recap: TitleRecap;
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
  const r = fr.projectTitles.recap;
  const [filter, setFilter] = useState<ContactState[]>([]);
  if (recap.titles.length === 0)
    return (
      <EmptyState
        icon={IconDisc}
        title={t.empty.title}
        body={canManage ? t.empty.body : t.empty.readOnly}
      />
    );

  const columns: Columns = {
    accord: recap.dealReach !== "none",
    legal: recap.canReadLegal,
    actions: canManage,
  };
  // Every column, hidden ones included (a group row spans them): the
  // title's, the artists', « ⋯ » when there is one.
  const allColumns = dataColumnCount(columns) + 1 + Number(columns.actions);

  // The counters filter the artists; a title stays while one of its
  // artists does (titles abandoned are out of the counts, so of the
  // filter too). None chosen: everything.
  const filtering = filter.length > 0;
  const groups = recap.titles
    .map((title) => ({
      title,
      participations: filtering
        ? title.participations.filter(
            (p) =>
              p.recap.contactState !== null &&
              filter.includes(p.recap.contactState),
          )
        : title.participations,
    }))
    .filter(
      (group) =>
        !filtering ||
        (group.title.status !== "abandoned" && group.participations.length > 0),
    );
  const live = groups.filter((g) => g.title.status !== "abandoned");
  const abandoned = groups.filter((g) => g.title.status === "abandoned");

  // Décision 4.1: where each artist is already invited (a participation in
  // play, on a title not abandoned), for « Ajouter un artiste ».
  const invited = new Map<string, Array<{ titleId: string; label: string }>>();
  for (const title of recap.titles) {
    if (title.status === "abandoned") continue;
    for (const p of title.participations)
      if (isActiveParticipation(p.status))
        invited.set(p.artist.id, [
          ...(invited.get(p.artist.id) ?? []),
          { titleId: title.id, label: title.recap.label },
        ]);
  }
  const invitedOn = (titleId: string) =>
    Object.fromEntries(
      [...invited]
        .map(
          ([artistId, list]) =>
            [
              artistId,
              list.filter((i) => i.titleId !== titleId).map((i) => i.label),
            ] as const,
        )
        .filter(([, labels]) => labels.length > 0),
    );

  const total = CONTACT_STATES.reduce((sum, s) => sum + recap.counts[s], 0);
  const rows = (list: typeof groups, first: boolean) =>
    list.map(({ title, participations }, index) => (
      <Fragment key={title.id}>
        <TitleGroup
          first={first && index === 0}
          projectId={projectId}
          title={title}
          participations={participations}
          columns={columns}
          canManage={canManage}
          canReadLegal={recap.canReadLegal}
          canEditNetwork={recap.canEditNetwork}
          call={recap.call}
          artists={artists}
          invitedOn={invitedOn(title.id)}
          masterOptions={masterOptions}
          links={links}
          today={today}
        />
      </Fragment>
    ));

  return (
    <div className="flex flex-col gap-3">
      {total > 0 && (
        <div
          role="group"
          aria-label={r.filters}
          className="flex flex-wrap gap-2"
        >
          {CONTACT_STATES.map((state) => (
            <FilterChip
              key={state}
              pressed={filter.includes(state)}
              disabled={recap.counts[state] === 0}
              onClick={() =>
                setFilter((current) =>
                  current.includes(state)
                    ? current.filter((s) => s !== state)
                    : [...current, state],
                )
              }
            >
              {r.contactStates[state]}
              <span className="tabular-nums opacity-60">
                {recap.counts[state]}
              </span>
            </FilterChip>
          ))}
        </div>
      )}
      {groups.length === 0 ? (
        <EmptyNote>{r.filteredEmpty}</EmptyNote>
      ) : (
        // The tiers read this frame's width (TIER); `isolate`: what stands
        // above a row (`relative z-10`) stays inside the table.
        <div className="@container isolate">
          <DataTable>
            <DataTableHeader>
              <DataTableHead className={cn(COLUMN.title, TIER.merged)}>
                {t.columns.title}
              </DataTableHead>
              <DataTableHead fill className="w-full max-w-0 pl-4">
                {r.columns.artist}
              </DataTableHead>
              <DataTableHead className={cn(COLUMN.status, TIER.merged)}>
                {r.columns.status}
              </DataTableHead>
              {columns.accord && (
                <DataTableHead className={cn(COLUMN.accord, TIER.full)}>
                  {r.columns.accord}
                </DataTableHead>
              )}
              {columns.legal && (
                <DataTableHead className={cn(COLUMN.legal, TIER.full)}>
                  {r.columns.legal}
                </DataTableHead>
              )}
              {columns.actions && (
                <DataTableActionsHead label={t.columns.actions} />
              )}
            </DataTableHeader>
            <DataTableBody>
              {rows(live, true)}
              {abandoned.length > 0 && (
                <DataTableGroupRow columns={allColumns}>
                  <span className="text-[length:var(--type-body-md)] font-semibold">
                    {t.abandonedGroup}
                    <span className="ml-1.5 font-medium text-[color:var(--text-tertiary)]">
                      {abandoned.length}
                    </span>
                  </span>
                </DataTableGroupRow>
              )}
              {rows(abandoned, live.length === 0)}
            </DataTableBody>
          </DataTable>
        </div>
      )}
    </div>
  );
}

type Dialog = "add" | "rename" | "name" | "abandon" | "attach";

type GroupProps = {
  projectId: string;
  title: RecapTitle;
  // Its artists shown (the counters may filter them).
  participations: RecapParticipation[];
  columns: Columns;
  canManage: boolean;
  canReadLegal: boolean;
  canEditNetwork: boolean;
  call: SharedNegotiationCall | null;
  artists: ArtistChoices;
  invitedOn: Record<string, string[]>;
  masterOptions: Record<string, string>;
  links: BoardLinks;
  today: string;
  // The table's first title (no hairline under the header).
  first: boolean;
};

/** A title's group, its rows in the board's body: the title's cell (a <th> over the
 * group, `rowgroup`) in its first row, spanning its artists' rows, or «
 * Aucun artiste invité » (with « Ajouter un artiste » for whoever writes).
 * Under 624 px the same cell on a row of its own above them. Holds the
 * title's dialogs (« ⋯ », « Nommer »), once, and its release, saved at the
 * choice and shown at once. */
function TitleGroup(props: GroupProps) {
  const { projectId, title, participations, columns, canManage } = props;
  const label = title.recap.label;
  const abandoned = title.status === "abandoned";
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [release, setRelease] = useOptimistic(title.recap.releaseDecision);
  const [releasePending, startRelease] = useTransition();
  const credit = creditOf(title);
  const pickRelease = (value: ReleaseValue) =>
    startRelease(async () => {
      const next = value === "yes" ? true : value === "no" ? false : null;
      setRelease(next);
      const result = await setTitleRelease({
        projectId,
        titleId: title.id,
        release: next,
      });
      if (!result.ok) toast.error(result.error);
    });

  // Rendered twice (the merged cell, the row of its own under 624 px), one
  // shown: its menu and buttons open the dialogs held once below.
  const block = (
    <TitleBlock
      title={title}
      label={label}
      links={props.links}
      canManage={canManage}
      canReadLegal={props.canReadLegal}
      today={props.today}
      release={releaseValueOf(release)}
      releasePending={releasePending}
      onRelease={pickRelease}
      onDialog={setDialog}
      menu={
        <TitleMenu
          projectId={projectId}
          title={title}
          label={label}
          canManage={canManage}
          onDialog={setDialog}
        />
      }
    />
  );
  const titleCell = (
    <DataTableCell
      scope="rowgroup"
      rowSpan={Math.max(participations.length, 1)}
      className={cn(COLUMN.title, TIER.merged, TITLE_CELL)}
    >
      {block}
      <TitleDialogs
        projectId={projectId}
        title={title}
        label={label}
        artists={props.artists}
        invitedOn={props.invitedOn}
        masterOptions={props.masterOptions}
        canManage={canManage}
        credit={credit}
        dialog={dialog}
        onDialog={setDialog}
      />
    </DataTableCell>
  );

  const noArtist = (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className={muted}>{fr.projectTitles.board.noArtist}</span>
      {canManage &&
        !abandoned &&
        Object.keys(props.artists.options).length > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDialog("add")}
          >
            {fr.projectTitles.participations.add.action}
          </Button>
        )}
    </span>
  );

  return (
    <>
      <Row className={TIER.stacked}>
        {/* Across the table's columns there (Artiste, « ⋯ » if any). */}
        <DataTableCell
          scope="rowgroup"
          colSpan={columns.actions ? 2 : 1}
          className={TITLE_CELL}
        >
          {block}
        </DataTableCell>
      </Row>
      {participations.map((participation, index) => (
        <ParticipationRow
          key={participation.id}
          projectId={projectId}
          participation={participation}
          titleCell={index === 0 ? titleCell : null}
          first={props.first}
          label={label}
          credit={credit}
          columns={columns}
          call={props.call}
          canEditNetwork={props.canEditNetwork && !abandoned}
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
      {participations.length === 0 && (
        <Row lead first={props.first}>
          {titleCell}
          {/* Over the artists' columns shown at each tier (TIER): 1 under
              624 px, Artiste and Statut to 976, then all of them. */}
          <DataTableCell className={cn(ARTIST_CELL, TIER.stacked)}>
            {noArtist}
          </DataTableCell>
          <DataTableCell
            colSpan={2}
            className={cn("pl-4 whitespace-normal", TIER.between)}
          >
            {noArtist}
          </DataTableCell>
          <DataTableCell
            colSpan={dataColumnCount(columns)}
            className={cn("pl-4 whitespace-normal", TIER.full)}
          >
            {noArtist}
          </DataTableCell>
          {columns.actions && (
            <DataTableActionsCell>{null}</DataTableActionsCell>
          )}
        </Row>
      )}
    </>
  );
}

/** A label and its value in the title's cell, aligned with the others. */
function TitleFact({ name, children }: { name: string; children: ReactNode }) {
  return (
    <>
      <dt className={caption}>{name}</dt>
      <dd className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
        {children}
      </dd>
    </>
  );
}

/** The title's cell, one under the other: its label (to its Master) and
 * status, « ⋯ » at the top right; its number and place in the Catalogue
 * (why it was abandoned); « Nommer » while it has no name (Ibé 18/11, 37:03:
 * « il faut les mettre dans le catalogue d'abord ? »); then Mix (its
 * Master), Beatmaker (their fiche; no line without one), Sortie (oui / non
 * / pas décidé, edited here), Distribution (once the project has one); the
 * warnings of a shared master and, for whoever does not read the
 * Juridique, of contracts not signed. */
function TitleBlock({
  title,
  label,
  links,
  canManage,
  canReadLegal,
  today,
  release,
  releasePending,
  onRelease,
  onDialog,
  menu,
}: {
  title: RecapTitle;
  label: string;
  links: BoardLinks;
  canManage: boolean;
  canReadLegal: boolean;
  today: string;
  release: ReleaseValue;
  releasePending: boolean;
  onRelease: (value: ReleaseValue) => void;
  onDialog: (dialog: Dialog) => void;
  menu: ReactNode;
}) {
  const t = fr.projectTitles;
  const f = t.recap.facts;
  const abandoned = title.status === "abandoned";
  const masterHref = masterHrefOf(title, links);
  // An abandoned title is out of the Master (lot 9): no state there.
  const mixFact = abandoned ? null : titleMixFact(title.masterState);
  const mix = mixFact?.label ?? null;
  const mixStatus = mixFact?.status ?? null;
  const distribution = links.distribution?.[title.id] ?? null;
  const shared =
    title.sharedWith && !abandoned
      ? t.participations.shared(title.sharedWith.names, title.sharedWith.hidden)
      : null;
  // Lot 12: its confirmed artists without their contract signed (the shoot
  // and the release wait for them, or for a waiver). Said by each artist's
  // row once the reader reads the Juridique: only for the others here.
  const missing = canReadLegal
    ? []
    : title.participations
        .filter((p) => contractGap(title, p, today) !== null)
        .map((p) => p.artist.name);
  const warning = cn(
    caption,
    "flex items-start gap-1.5 text-[color:var(--tone-warning-fg)]",
  );

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              "min-w-0 font-semibold [overflow-wrap:anywhere]",
              abandoned && "text-[color:var(--text-secondary)]",
            )}
          >
            {masterHref ? (
              <ViewLink href={masterHref} className={NAME_LINK}>
                {label}
              </ViewLink>
            ) : (
              label
            )}
          </span>
          <StatusBadge tone={projectTitleTone[title.status]} size="sm">
            {t.statuses[title.status]}
          </StatusBadge>
        </div>
        <span className="-my-1.5 -mr-1.5 shrink-0">{menu}</span>
      </div>
      {/* Wraps rather than cut: « Maquette · En développement » keeps its
          status. */}
      <span
        className={cn(caption, "line-clamp-2 break-words")}
        // The whole reason of an abandonment, when two lines cut it.
        title={abandoned ? (title.abandonReason ?? undefined) : undefined}
      >
        {detailOf(title, label)}
      </span>
      {canManage && !abandoned && isUnnamed(title) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 self-start"
          aria-label={t.recap.name.title(label)}
          onClick={() => onDialog("name")}
        >
          {t.recap.name.action}
        </Button>
      )}
      <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2">
        <TitleFact name={f.mix}>
          <MixPill label={mix} status={mixStatus} href={masterHref} />
        </TitleFact>
        {title.recap.beatmakers.length > 0 && (
          <TitleFact name={f.beatmaker}>
            <span className="flex min-w-0 flex-col items-start gap-1">
              {title.recap.beatmakers.map((person) => (
                <span
                  key={person.contactId ?? person.name}
                  className="flex max-w-full min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1"
                >
                  <span className="min-w-0 break-words text-[color:var(--text-secondary)]">
                    {person.name}
                  </span>
                  {person.fiche && <FichePill fiche={person.fiche} />}
                </span>
              ))}
            </span>
          </TitleFact>
        )}
        <TitleFact name={f.release}>
          <ReleaseChoice
            label={label}
            value={release}
            canEdit={canManage && !abandoned}
            pending={releasePending}
            onPick={onRelease}
          />
        </TitleFact>
        {links.distribution !== null && (
          <TitleFact name={f.distribution}>
            {distribution ? (
              <ViewLink href={distribution.href} className={PILL_LINK}>
                <StatusBadge
                  tone={distribution.tone}
                  size="sm"
                  className="h-auto min-h-5 max-w-full py-0.5 text-left whitespace-normal"
                >
                  {distribution.label}
                </StatusBadge>
              </ViewLink>
            ) : (
              <span className={muted}>{EMPTY_CELL}</span>
            )}
          </TitleFact>
        )}
      </dl>
      {/* A simple project shares its master: no automatic credit, said
          where the title is (décision 10). */}
      {shared && (
        <span className={cn(warning, "mt-2")}>
          <IconTriangleWarning aria-hidden className="mt-0.5 size-4 shrink-0" />
          {`${shared}.`}
        </span>
      )}
      {missing.length > 0 && (
        <span className={cn(warning, "mt-2")}>
          <IconTriangleWarning aria-hidden className="mt-0.5 size-4 shrink-0" />
          {fr.participationWaivers.titleMissing(missing.join(", "))}
        </span>
      )}
    </div>
  );
}

/** An artist on a title, beside the title's cell (`titleCell`, given to
 * the group's first row): name and role, note, contact; Statut, Accord,
 * Juridique; « ⋯ ». The name opens the person's démarche in the Juridique,
 * else the deal. */
function ParticipationRow({
  projectId,
  participation,
  titleCell,
  first,
  label,
  credit,
  columns,
  call,
  canEditNetwork,
  today,
  dimmed,
  canManage,
  toCheck,
}: {
  projectId: string;
  participation: RecapParticipation;
  titleCell: ReactNode;
  first: boolean;
  label: string;
  credit: Credit;
  columns: Columns;
  call: SharedNegotiationCall | null;
  canEditNetwork: boolean;
  today: string;
  dimmed: boolean;
  canManage: boolean;
  toCheck: boolean;
}) {
  const t = fr.projectTitles;
  const r = t.recap;
  const active = isActiveParticipation(participation.status) && !dimmed;
  const facts = participation.recap;
  const artist = participation.artist.name;
  const href = facts.contract?.href ?? facts.accord?.href ?? null;
  const accord = (inline: boolean) =>
    facts.accord ? (
      <AccordFacts
        accord={facts.accord}
        artist={artist}
        inline={inline}
        planCall={
          !dimmed && plansCall(call, facts.accord) ? (
            <PlanCallButton shared={call} accord={facts.accord} />
          ) : undefined
        }
      />
    ) : (
      <span className={muted}>{EMPTY_CELL}</span>
    );
  const legal = (inline: boolean) => (
    <LegalFacts fiche={facts.fiche} contract={facts.contract} inline={inline} />
  );

  return (
    <Row lead={titleCell !== null} first={first}>
      {titleCell}
      <DataTableCell fill className={ARTIST_CELL}>
        <span className="flex min-w-0 flex-col gap-0.5">
          {/* The role goes under the name when the table is narrow, rather
              than cutting the name. */}
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-1">
            <span
              className={cn(
                "flex min-w-0",
                !active && "text-[color:var(--text-secondary)]",
              )}
            >
              {href ? (
                <ViewLink href={href} className={cn(NAME_LINK, "truncate")}>
                  {artist}
                </ViewLink>
              ) : (
                <span className="truncate">{artist}</span>
              )}
            </span>
            <span className={cn(muted, "hidden shrink-0 @min-[624px]:inline")}>
              {`· ${t.participations.roles[participation.role]}`}
            </span>
          </span>
          {/* Under 624 px, the role and the status under the name. */}
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 @min-[624px]:hidden">
            <span className={caption}>
              {t.participations.roles[participation.role]}
            </span>
            <ContactStatePill status={participation.status} />
          </span>
          <NoteLine
            projectId={projectId}
            participationId={participation.id}
            artist={artist}
            note={facts.note}
            canEdit={canManage}
          />
          {/* None and nothing to do: no line (ContactFacts says nothing). */}
          {(facts.contact !== null || canManage) && (
            <span className="mt-1 flex min-w-0 flex-col">
              <ContactFacts
                projectId={projectId}
                participationId={participation.id}
                artist={artist}
                contact={facts.contact}
                canManage={canManage}
                canEditNetwork={canEditNetwork}
              />
            </span>
          )}
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
          {/* Under 976 px, Accord and Juridique, still links and buttons. */}
          {(columns.accord || columns.legal) && (
            <span className="mt-1.5 flex flex-col gap-1.5 @min-[976px]:hidden">
              {columns.accord && (
                <StackedFact label={r.columns.accord}>
                  {accord(true)}
                </StackedFact>
              )}
              {columns.legal && (
                <StackedFact label={r.columns.legal}>{legal(true)}</StackedFact>
              )}
            </span>
          )}
        </span>
      </DataTableCell>
      <DataTableCell className={cn(COLUMN.status, TIER.merged)}>
        <ContactStatePill status={participation.status} />
      </DataTableCell>
      {columns.accord && (
        <DataTableCell className={cn(COLUMN.accord, TIER.full)}>
          {accord(false)}
        </DataTableCell>
      )}
      {columns.legal && (
        <DataTableCell className={cn(COLUMN.legal, TIER.full)}>
          {legal(false)}
        </DataTableCell>
      )}
      {columns.actions && (
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
      )}
    </Row>
  );
}

/** « ⋯ » of a title: add an artist, rename and abandon in a modal (a
 * gesture that asks a saisie opens one, TitleDialogs), reactivate at once
 * (nothing to ask); its page in the Catalogue for everyone, once it has a
 * master. Lot 7: a title not in the Catalogue yet gets its title there,
 * provisional, at its first audio; or takes one the Catalogue has. */
function TitleMenu({
  projectId,
  title,
  label,
  canManage,
  onDialog,
}: {
  projectId: string;
  title: RecapTitle;
  label: string;
  canManage: boolean;
  onDialog: (dialog: Dialog) => void;
}) {
  const t = fr.projectTitles;
  const router = useRouter();
  const [, startTransition] = useTransition();
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
          onSelect: () => onDialog("attach"),
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
            onSelect: () => onDialog("add"),
          },
          {
            key: "rename",
            label: t.rename.action,
            icon: IconPenWriting2,
            onSelect: () => onDialog("rename"),
          },
          ...start,
          ...catalog,
          {
            key: "abandon",
            label: t.abandon.action,
            icon: IconBoxArchive,
            onSelect: () => onDialog("abandon"),
          },
        ];

  return <RowActions label={t.menu(label)} actions={actions} />;
}

/** The title's dialogs, once per title whichever of its cells is shown:
 * add an artist, rename, name (« Nommer », in its own words, with «
 * Rattacher un titre du Catalogue » under the field), attach, abandon. */
function TitleDialogs({
  projectId,
  title,
  label,
  artists,
  invitedOn,
  masterOptions,
  canManage,
  credit,
  dialog,
  onDialog,
}: {
  projectId: string;
  title: RecapTitle;
  label: string;
  artists: ArtistChoices;
  invitedOn: Record<string, string[]>;
  masterOptions: Record<string, string>;
  canManage: boolean;
  credit: Credit;
  dialog: Dialog | null;
  onDialog: (dialog: Dialog | null) => void;
}) {
  const t = fr.projectTitles;
  if (!canManage) return null;
  const close = () => onDialog(null);
  const provisional = title.master?.provisional
    ? t.rename.descriptionProvisional
    : undefined;

  return (
    <>
      <FormDialog
        open={dialog === "add"}
        onOpenChange={(next) => !next && close()}
        title={t.participations.add.title(label)}
        description={t.participations.add.description(
          credit.mode,
          credit.shared,
        )}
        closeLabel={fr.dialogs.close}
      >
        <AddParticipationForm
          projectId={projectId}
          title={title}
          artists={artists}
          invitedOn={invitedOn}
          onDone={close}
        />
      </FormDialog>
      <FormDialog
        open={dialog === "rename"}
        onOpenChange={(next) => !next && close()}
        title={t.rename.title}
        description={provisional}
        closeLabel={fr.dialogs.close}
      >
        <RenameTitleForm projectId={projectId} title={title} onDone={close} />
      </FormDialog>
      <FormDialog
        open={dialog === "name"}
        onOpenChange={(next) => !next && close()}
        title={t.recap.name.title(label)}
        description={provisional}
        closeLabel={fr.dialogs.close}
      >
        <RenameTitleForm
          projectId={projectId}
          title={title}
          submitLabel={t.recap.name.submit}
          doneMessage={t.recap.name.done}
          onAttach={
            !title.master && Object.keys(masterOptions).length > 0
              ? () => onDialog("attach")
              : undefined
          }
          onDone={close}
        />
      </FormDialog>
      {!title.master && (
        <FormDialog
          open={dialog === "attach"}
          onOpenChange={(next) => !next && close()}
          title={t.catalogAttach.title(label)}
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
        open={dialog === "abandon"}
        onOpenChange={(next) => !next && close()}
        title={t.abandon.title(label)}
        // Only a maquette in draft or in development becomes
        // « abandonnée »; a validated one keeps its status (décision 8).
        description={
          title.master?.demoStatus === "draft" ||
          title.master?.demoStatus === "developing"
            ? t.abandon.demoNote
            : undefined
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
  );
}

/** « ⋯ » of an artist on a title: change its status (modal), withdraw it
 * from the title (détacher, confirmed) or bring a declined or withdrawn
 * one back (rattacher, at once, « À contacter » again). */
function ParticipationActions({
  projectId,
  participation,
  label,
  credit,
}: {
  projectId: string;
  participation: RecapParticipation;
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
