"use client";

import {
  IconArrowDottedRotateAnticlockwise,
  IconBoxArchive,
  IconLink,
  IconMicrophone,
  IconMinus,
  IconPenWriting2,
  IconPhone,
  IconTriangleWarning,
} from "nucleo-sharp-essential";
import { useRouter } from "next/navigation";
import {
  Fragment,
  useOptimistic,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { IconArrowUpRight, IconDisc, IconUserPlus } from "@/components/icons";
import {
  ContactFacts,
  NoteLine,
  PlanCallDialog,
  ReleaseChoice,
  plansCall,
  releaseValueOf,
  type ReleaseValue,
} from "@/components/projects/titles/recap-edits";
import {
  AccordFacts,
  ContactStatePill,
  ContractFacts,
  FichePill,
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
import { WaiverLines, waiverTexts } from "@/components/legal/waiver-lines";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useScrollFade } from "@/components/ui/use-scroll-fade";
import { ViewLink } from "@/components/ui/view-link";
import { routes } from "@/lib/auth/redirects";
import { todayInParis } from "@/lib/contracts/types";
import type { SharedNegotiationCall } from "@/lib/deals/negotiation-call-rules";
import { dealCalls } from "@/lib/i18n/fr/deal-calls";
import { dialogs } from "@/lib/i18n/fr/dialogs";
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
import type { Tone } from "@/lib/ui/state-tones";
import { cn } from "@/lib/utils";
import { formatShortDay } from "@/lib/utils/day";

const fr = { dealCalls, dialogs, projectTitles };

/** Where a row leads: the project's Master (a title with a master), its
 * release's deposit in the Distribution (lot 15, by title: its own release,
 * else the compilation's). Null when the project has no such workflow. */
export type TitleDepositLink = { href: string; label: string; tone: Tone };
export type BoardLinks = {
  master: string | null;
  distribution: Record<string, TitleDepositLink> | null;
};

/** Which columns the table has besides those always there (Artiste,
 * Statut, Contact, Mix, Sortie, Beatmaker): Accord and Taux when the
 * reader sees deals (dealReach, lot 6); Fiche de renseignement and Contrat
 * with manage_legal; Distribution once the project has the workflow; « ⋯ »
 * for whoever writes the titles or may « Caler le call » on a row (none for
 * a reader: no empty column on the right). `notes`: the artists' notes in a
 * « Note » column of their own (Maël 23/11/2026), none on an overview (too
 * much there). */
type Columns = {
  accord: boolean;
  legal: boolean;
  distribution: boolean;
  actions: boolean;
  notes: boolean;
};

// Every column (a group row spans them).
const columnCount = (columns: Columns) =>
  6 +
  2 * Number(columns.accord) +
  2 * Number(columns.legal) +
  Number(columns.distribution) +
  Number(columns.notes) +
  Number(columns.actions);

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

/** The title's Master, open on this title (lot 8), once it has a master; an
 * abandoned title is out of it (lot 9). */
const masterHrefOf = (title: RecapTitle, links: BoardLinks) =>
  title.master && links.master && title.status !== "abandoned"
    ? `${links.master}?titre=${title.master.id}`
    : null;

// The columns, as wide as their facts need, never squeezed (`min-w-*`):
// the table is the Excel's width (Maël 22/11/2026: « toutes les colonnes de
// la feuille Excel »), wider than the page, and scrolls inside its frame,
// the page never does. Artiste stays on the left and « ⋯ » on the right
// (`sticky`, Maël 23/11/2026) while it scrolls, on their own ground so that
// nothing shows through, above the pills and buttons of the other cells
// (`z-20` > their `z-10`); their column rule drawn by the cell itself
// (`before:`, a border staying behind in a collapsed table, which paints no
// box-shadow on a cell either), so it follows the cell. `max-w-*`: a cell
// cuts its lines short (`truncate`) instead of widening its column. No drop shadow:
// not the site's art direction (Maël 23/11/2026). A cell says two lines at
// most (« 2 lignes par case »). Literal classes: Tailwind only generates
// what it reads in full.
const COLUMN = {
  artist:
    "sticky left-0 z-20 w-44 min-w-44 max-w-44 bg-card not-last:border-r-0 before:pointer-events-none before:absolute before:inset-y-0 before:right-0 before:w-px before:bg-[var(--border-hairline)] in-[.section-card_.table-flat]:before:hidden @min-[624px]:w-56 @min-[624px]:max-w-56 @min-[624px]:min-w-56",
  actions:
    "sticky right-0 z-20 w-16 bg-card pl-4 align-top py-2 before:pointer-events-none before:absolute before:inset-y-0 before:left-0 before:w-px before:bg-[var(--border-hairline)] in-[.section-card_.table-flat]:before:hidden",
  status: "w-32 min-w-32 max-w-32",
  contact: "w-56 min-w-56 max-w-56",
  accord: "w-44 min-w-44 max-w-44",
  rate: "w-20 min-w-20 max-w-20",
  fiche: "w-48 min-w-48 max-w-48",
  contract: "w-44 min-w-44 max-w-44",
  mix: "w-36 min-w-36 max-w-36",
  release: "w-32 min-w-32 max-w-32",
  distribution: "w-44 min-w-44 max-w-44",
  beatmaker: "w-48 min-w-48 max-w-48",
  // The note, two lines at most (the whole on hover).
  note: "w-72 min-w-72 max-w-72",
} as const;

// A row's cells read from the top: an artist's name may take several lines
// (its title, its waivers), its pills stay beside its first one.
const CELL = "align-top whitespace-normal";

// The header's sticky cells (Artiste, « ⋯ ») on the header's band: the
// card's ground under the band's tint (translucent in the dark theme, it
// would let the columns scrolled under it show through); bare in a section
// card, as the band.
const STICKY_HEAD =
  "[background-image:linear-gradient(var(--surface-soft),var(--surface-soft))] in-[.section-card_.table-flat]:[background-image:none]";

// Without « ⋯ » (a reader), the right edge fades out while columns remain
// there.
const END_FADE =
  "[&_[data-slot=table-container][data-fade=both]]:[mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] [&_[data-slot=table-container][data-fade=end]]:[mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)]";

// A row of the board. Not DataTableRow: no link covers a row here (its
// cells hold several links and gestures), so nothing lights up under the
// pointer.
const ROW = cn(
  "border-0 hover:bg-transparent has-aria-expanded:bg-transparent",
  ROW_INSET,
);

// A name that opens its page (the artist's démarche, the title's Master):
// the link is the name itself.
const NAME_LINK =
  "rounded-sm outline-none hover:underline focus-visible:underline";

// A gesture said in a line of text (« Nommer »), underlined.
const INLINE_ACTION =
  "relative z-10 shrink-0 rounded-sm text-[length:var(--type-caption)] font-medium text-[color:var(--text-secondary)] underline underline-offset-2 outline-none hover:text-[color:var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]";

const WARNING = cn(
  caption,
  "flex items-start gap-1.5 text-[color:var(--tone-warning-fg)]",
);

const Empty = () => <span className={muted}>{EMPTY_CELL}</span>;

/**
 * « Titres et artistes » of a collective project, read as the team's Excel
 * (retours d'Ibé du 18/11/2026; Maël 22/11/2026: « une ligne, ça soit un
 * artiste »): one row per artist on a title, as the overview's recap, with
 * the columns of the Excel — Artiste (its title under the name, « Nommer »
 * while it has none; its waivers), Statut (« À contacter », « Contacté »,
 * « D'accord »), Contact (the Excel's TEL: « Appeler », « WhatsApp »),
 * Accord (deal, call; « Caler le call »), Taux, Fiche de renseignement
 * (« Pas envoyée », « Envoyée », « Renseignée », opening the fiche itself),
 * Contrat, Mix, Sortie (edited here), Distribution, Beatmaker (and their
 * fiche), Note (edited here, Maël 23/11/2026). The fiche's personal data
 * stay in the fiche.
 * A title's facts repeat on each of its artists' rows, as in the Excel; a
 * title without an artist has its own row. « Le tableau lit, les modules
 * font »: each name and pill leads to its module. Counters on top filter
 * the artists by status; the abandoned titles come last, under
 * « Abandonnés ». The « ⋯ » of a row: « Caler le call » and the artist's
 * gestures, then its title's (no button in a cell, Maël 25/11/2026). Wider
 * than the page: it scrolls inside its frame, Artiste kept on the left.
 */
export function TitlesBoard({
  projectId,
  recap,
  canManage,
  artists,
  masterOptions = {},
  links,
  notes = true,
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
  // The artists' notes, read and written; none on an overview.
  notes?: boolean;
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
    distribution: links.distribution !== null,
    // « Caler le call » is in the row's « ⋯ » (Maël 25/11/2026): a
    // negotiator who does not write the titles has the column too.
    actions:
      canManage ||
      recap.titles.some(
        (title) =>
          title.status !== "abandoned" &&
          title.participations.some(
            (p) => p.recap.accord && plansCall(recap.call, p.recap.accord),
          ),
      ),
    notes,
  };

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
  const rows = (list: typeof groups, layout: Layout) =>
    list.map(({ title, participations }) => (
      <Fragment key={title.id}>
        <TitleRows
          layout={layout}
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

  const abandonedHead = (
    <>
      {t.abandonedGroup}
      <span className="ml-1.5 font-medium text-[color:var(--text-tertiary)]">
        {abandoned.length}
      </span>
    </>
  );

  // The table from 640 px of board, else its cards (a phone, Maël
  // 23/11/2026): both written, the board's width shows one (container
  // query), so that nothing jumps at load.
  return (
    <div className="@container/board flex flex-col gap-3">
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
        <>
          <div className="hidden @min-[40rem]/board:block">
            <ScrollingTable fadeEnd={!columns.actions}>
              <DataTableHeader>
                <DataTableHead className={cn(COLUMN.artist, STICKY_HEAD)}>
                  {r.columns.artist}
                </DataTableHead>
                <DataTableHead className={COLUMN.status}>
                  {r.columns.status}
                </DataTableHead>
                <DataTableHead className={COLUMN.contact}>
                  {r.columns.contact}
                </DataTableHead>
                {columns.accord && (
                  <>
                    <DataTableHead className={COLUMN.accord}>
                      {r.columns.accord}
                    </DataTableHead>
                    <DataTableHead className={COLUMN.rate}>
                      {r.columns.rate}
                    </DataTableHead>
                  </>
                )}
                {columns.legal && (
                  <>
                    <DataTableHead className={COLUMN.fiche}>
                      {r.columns.fiche}
                    </DataTableHead>
                    <DataTableHead className={COLUMN.contract}>
                      {r.columns.contract}
                    </DataTableHead>
                  </>
                )}
                <DataTableHead className={COLUMN.mix}>
                  {r.columns.mix}
                </DataTableHead>
                <DataTableHead className={COLUMN.release}>
                  {r.columns.release}
                </DataTableHead>
                {columns.distribution && (
                  <DataTableHead className={COLUMN.distribution}>
                    {r.columns.distribution}
                  </DataTableHead>
                )}
                <DataTableHead className={COLUMN.beatmaker}>
                  {r.columns.beatmaker}
                </DataTableHead>
                {columns.notes && (
                  <DataTableHead className={COLUMN.note}>
                    {r.columns.note}
                  </DataTableHead>
                )}
                {columns.actions && (
                  <DataTableActionsHead
                    label={t.columns.actions}
                    className={cn(COLUMN.actions, STICKY_HEAD)}
                  />
                )}
              </DataTableHeader>
              <DataTableBody>
                {rows(live, "table")}
                {abandoned.length > 0 && (
                  <DataTableGroupRow columns={columnCount(columns)}>
                    {/* Kept in sight while the table scrolls sideways. */}
                    <span className="sticky left-4 inline-flex text-[length:var(--type-body-md)] font-semibold">
                      {abandonedHead}
                    </span>
                  </DataTableGroupRow>
                )}
                {rows(abandoned, "table")}
              </DataTableBody>
            </ScrollingTable>
          </div>
          <div className="flex flex-col gap-3 @min-[40rem]/board:hidden">
            {rows(live, "cards")}
            {abandoned.length > 0 && (
              <p className="mt-2 px-1 text-[length:var(--type-body-md)] font-semibold">
                {abandonedHead}
              </p>
            )}
            {rows(abandoned, "cards")}
          </div>
        </>
      )}
    </div>
  );
}

/** The table in its frame, scrolling sideways when it is wider (the
 * shadcn Table's own box, `data-slot="table-container"`); without « ⋯ »
 * (`fadeEnd`), the right edge fades while columns are hidden there. Mounted
 * with the table, so that it follows each table shown. `isolate`: what
 * stands above a cell (`relative z-10`, the sticky columns) stays inside
 * the table. */
function ScrollingTable({
  fadeEnd,
  children,
}: {
  fadeEnd: boolean;
  children: ReactNode;
}) {
  const box = useRef<HTMLElement | null>(null);
  useScrollFade(box, "x");
  return (
    <div
      ref={(node) => {
        box.current =
          node?.querySelector<HTMLElement>('[data-slot="table-container"]') ??
          null;
      }}
      className={cn("@container isolate", fadeEnd && END_FADE)}
    >
      <DataTable>{children}</DataTable>
    </div>
  );
}

type Dialog = "add" | "rename" | "name" | "abandon" | "attach";

/** A row of the table, or a card of the phone's list. */
type Layout = "table" | "cards";

type TitleRowsProps = {
  layout: Layout;
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
};

/** A title's rows (`layout="table"`) or cards (`layout="cards"`, a phone):
 * one per artist shown, else « Aucun artiste invité » (with « Ajouter un
 * artiste » for whoever writes). Holds what the title's rows share: its
 * facts (Mix, Sortie, Distribution, Beatmaker, the same on each row), its
 * release, saved at the choice and shown at once on all of them, its
 * gestures (in each row's « ⋯ ») and their dialogs, once. */
function TitleRows(props: TitleRowsProps) {
  const { projectId, title, participations, columns, canManage, links } = props;
  const t = fr.projectTitles;
  const r = t.recap;
  const label = title.recap.label;
  const abandoned = title.status === "abandoned";
  const cards = props.layout === "cards";
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [release, setRelease] = useOptimistic(title.recap.releaseDecision);
  const [releasePending, startRelease] = useTransition();
  const credit = creditOf(title);
  const titleActions = useTitleActions({
    projectId,
    title,
    canManage,
    onDialog: setDialog,
  });
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

  const masterHref = masterHrefOf(title, links);
  // An abandoned title is out of the Master (lot 9): no state there.
  const mixFact = abandoned ? null : titleMixFact(title.masterState);
  const distribution = links.distribution?.[title.id] ?? null;
  const titleFacts: Fact[] = [
    {
      key: "mix",
      label: r.columns.mix,
      column: COLUMN.mix,
      node: (
        <MixPill
          label={mixFact?.label ?? null}
          status={mixFact?.status ?? null}
          href={masterHref}
        />
      ),
    },
    {
      key: "release",
      label: r.columns.release,
      column: COLUMN.release,
      node: (
        <ReleaseChoice
          label={label}
          value={releaseValueOf(release)}
          canEdit={canManage && !abandoned}
          pending={releasePending}
          onPick={pickRelease}
        />
      ),
    },
    ...(columns.distribution
      ? [
          {
            key: "distribution",
            label: r.columns.distribution,
            column: COLUMN.distribution,
            node: distribution ? (
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
              <Empty />
            ),
          },
        ]
      : []),
    {
      key: "beatmaker",
      label: r.columns.beatmaker,
      column: COLUMN.beatmaker,
      node: <BeatmakerFacts people={title.recap.beatmakers} />,
    },
  ];
  const onName =
    canManage && !abandoned && isUnnamed(title)
      ? () => setDialog("name")
      : undefined;
  const titleLine = (
    <TitleLine title={title} label={label} href={masterHref} onName={onName} />
  );
  // Once per title, in its first row's « ⋯ » cell (a dialog shows in a
  // portal, wherever it is written).
  const dialogs = (
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
  );

  if (participations.length === 0) {
    // Two lines in its cell; « Ajouter un artiste » in the artist's
    // columns beside, empty without one (a card: under its head).
    const empty = (
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className={cn(muted, "truncate")}>{t.board.noArtist}</span>
        {titleLine}
      </span>
    );
    const add = canManage &&
      !abandoned &&
      Object.keys(props.artists.options).length > 0 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setDialog("add")}
        >
          {t.participations.add.action}
        </Button>
      );
    const menu = columns.actions && (
      <RowActions label={t.menu(label)} actions={titleActions} />
    );
    if (cards)
      return (
        <FactCard
          head={
            <span className="flex min-w-0 flex-col items-start gap-2">
              {empty}
              {add}
            </span>
          }
          menu={menu}
          facts={titleFacts}
        >
          {dialogs}
        </FactCard>
      );
    return (
      <TableRow className={ROW}>
        <DataTableCell className={cn(COLUMN.artist, CELL)}>
          {empty}
        </DataTableCell>
        {/* The artist's columns: nothing to say without one. */}
        <DataTableCell
          colSpan={2 + 2 * Number(columns.accord) + 2 * Number(columns.legal)}
          className={cn(CELL, "py-2")}
        >
          {add || null}
        </DataTableCell>
        <FactCells facts={titleFacts} />
        {columns.notes && (
          <DataTableCell className={cn(COLUMN.note, CELL)}>
            {null}
          </DataTableCell>
        )}
        {columns.actions && (
          <DataTableActionsCell className={COLUMN.actions}>
            {menu}
            {dialogs}
          </DataTableActionsCell>
        )}
      </TableRow>
    );
  }

  // Each artist's row says its title under its name, a title shared by
  // several artists too (Maël 23/11/2026: a group head made the rows of the
  // next titles look like its own). Sortie stays one decision of the title.
  const artistRows = participations.map((participation, index) => (
    <ArtistRow
      key={participation.id}
      layout={props.layout}
      projectId={projectId}
      title={title}
      participation={participation}
      label={label}
      credit={credit}
      columns={columns}
      call={props.call}
      canReadLegal={props.canReadLegal}
      canEditNetwork={props.canEditNetwork && !abandoned}
      today={props.today}
      titleLine={titleLine}
      titleFacts={titleFacts}
      titleActions={titleActions}
      dialogs={index === 0 ? dialogs : null}
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
  ));
  return <>{artistRows}</>;
}

/** An artist's alerts (credits to check, contract not signed, waivers)
 * as one icon beside its name, their words in a tooltip and for a screen
 * reader: the cell keeps two lines. `strong`: one waits for the contract,
 * in the warning's ink. */
function AlertsIcon({ alerts, strong }: { alerts: string[]; strong: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            aria-label={`${fr.projectTitles.board.alerts} : ${alerts.join(". ")}`}
            className={cn(
              "relative z-10 inline-flex shrink-0 self-center rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--focus-ring)]",
              strong
                ? "text-[color:var(--tone-warning-fg)]"
                : "text-[color:var(--text-tertiary)]",
            )}
          />
        }
      >
        <IconTriangleWarning aria-hidden className="size-4" />
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <span className="flex flex-col gap-0.5">
          {alerts.map((alert) => (
            <span key={alert}>{alert}</span>
          ))}
        </span>
      </TooltipContent>
    </Tooltip>
  );
}

/** The title's beatmakers in two lines: their names (cut short, the whole
 * on hover), then the fiche of the one, or how many of theirs are filled. */
function BeatmakerFacts({
  people,
}: {
  people: RecapTitle["recap"]["beatmakers"];
}) {
  const r = fr.projectTitles.recap;
  if (people.length === 0) return <Empty />;
  const names = people.map((person) => person.name).join(", ");
  const fiches = people.flatMap((person) =>
    person.fiche ? [{ fiche: person.fiche, name: person.name }] : [],
  );
  return (
    <span className="flex max-w-full min-w-0 flex-col items-start gap-1">
      <span
        className="max-w-full truncate text-[color:var(--text-secondary)]"
        title={names}
      >
        {names}
      </span>
      {fiches.length === 1 ? (
        <FichePill fiche={fiches[0].fiche} name={fiches[0].name} />
      ) : fiches.length > 1 ? (
        <span className={cn(caption, "max-w-full truncate")}>
          {r.legal.fichesFilled(
            fiches.filter((f) => f.fiche.state === "filled").length,
            fiches.length,
          )}
        </span>
      ) : null}
    </span>
  );
}

/** A column's fact (its header's words, its width, what it shows), told
 * once for a row's cell and a card's pair. */
type Fact = { key: string; label: string; column: string; node: ReactNode };

/** The facts as a row's cells. */
function FactCells({ facts }: { facts: Fact[] }) {
  return (
    <>
      {facts.map((fact) => (
        <DataTableCell key={fact.key} className={cn(fact.column, CELL)}>
          {fact.node}
        </DataTableCell>
      ))}
    </>
  );
}

/** A row on a phone (Maël 23/11/2026: two sticky columns left 120 px to
 * read): a card, its head (the artist and its title, status) with
 * « ⋯ » at its top right, then its facts one under the other, label and
 * value. Cards keep apart by their gap, never a rule (no-dividers); the
 * card's own outline is the design system's. `children`: the title's
 * dialogs, once. */
function FactCard({
  head,
  menu,
  facts,
  children,
}: {
  head: ReactNode;
  menu: ReactNode;
  facts: Fact[];
  children?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-[color:var(--border-default)] bg-card p-4 text-[length:var(--type-body-md)] font-medium">
      <div className="flex min-w-0 items-start gap-2">
        <div className="min-w-0 flex-1">{head}</div>
        {menu && <div className="-mt-1.5 -mr-2 shrink-0">{menu}</div>}
        {children}
      </div>
      <dl className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)] gap-x-3 gap-y-2.5">
        {facts.map((fact) => (
          <Fragment key={fact.key}>
            <dt className={cn(caption, "pt-0.5 break-words")}>{fact.label}</dt>
            <dd className="flex min-w-0 flex-col items-start">{fact.node}</dd>
          </Fragment>
        ))}
      </dl>
    </div>
  );
}

/** Under the artist's name, its title on one line: its label (to its
 * Master, cut short, the whole on hover) and « Nommer » while it has no name
 * (Ibé 18/11, 37:03: « il faut les mettre dans le catalogue d'abord ? »);
 * why it was abandoned on hover. */
function TitleLine({
  title,
  label,
  href,
  onName,
}: {
  title: RecapTitle;
  label: string;
  href: string | null;
  onName?: () => void;
}) {
  const t = fr.projectTitles;
  const reason =
    title.status === "abandoned" && title.abandonedAt && title.abandonReason
      ? t.abandonedOn(
          formatShortDay(title.abandonedAt, { bare: true }),
          title.abandonReason,
        )
      : null;
  const hover = reason ? `${label} · ${reason}` : label;
  return (
    <span className={cn(caption, "flex min-w-0 items-baseline gap-x-1.5")}>
      {href ? (
        <ViewLink
          href={href}
          title={hover}
          // The links' own ink (globals) would outshine the artist's name:
          // the caption's grey, a step darker.
          className={cn(
            NAME_LINK,
            "min-w-0 truncate text-[color:var(--text-secondary)]",
          )}
        >
          {label}
        </ViewLink>
      ) : (
        <span title={hover} className="min-w-0 truncate">
          {label}
        </span>
      )}
      {onName && (
        <button
          type="button"
          aria-label={t.recap.name.title(label)}
          onClick={onName}
          className={INLINE_ACTION}
        >
          {t.recap.name.action}
        </button>
      )}
    </span>
  );
}

/** An artist on a title, one row: Artiste (name and role, its title, its
 * waivers), Statut, Contact, Accord, Taux, Fiche de renseignement, Contrat,
 * then its title's facts, Note, « ⋯ » (the artist's gestures, then the
 * title's). On a phone (`layout="cards"`), a card: name, title, status,
 * then the same facts in pairs, the note last. The name opens the person's démarche
 * in the Juridique, else the deal. */
function ArtistRow({
  layout,
  projectId,
  title,
  participation,
  label,
  credit,
  columns,
  call,
  canReadLegal,
  canEditNetwork,
  today,
  titleLine,
  titleFacts,
  titleActions,
  dialogs,
  dimmed,
  canManage,
  toCheck,
}: {
  layout: Layout;
  projectId: string;
  title: RecapTitle;
  participation: RecapParticipation;
  label: string;
  credit: Credit;
  columns: Columns;
  call: SharedNegotiationCall | null;
  canReadLegal: boolean;
  canEditNetwork: boolean;
  today: string;
  titleLine: ReactNode;
  titleFacts: Fact[];
  titleActions: RowAction[];
  dialogs: ReactNode;
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
  // Lot 12: confirmed without its contract signed, the shoot and the
  // release wait for it (or a waiver). Said by the Contrat column to whoever
  // reads the Juridique; under the name for the others.
  const missing =
    !canReadLegal && contractGap(title, participation, today) !== null;
  const plansCallHere =
    !dimmed && facts.accord !== null && plansCall(call, facts.accord);

  const status = <ContactStatePill status={participation.status} />;
  // The alerts in words: a tooltip beside the name in the table (two lines
  // a cell), lines under the name on a card.
  const alerts = [
    ...(toCheck ? [t.participations.sharedShort] : []),
    ...(missing ? [r.contractMissing] : []),
    ...(dimmed ? [] : waiverTexts(participation.waivers, today)),
  ];
  const name = (
    <span className="flex min-w-0 items-baseline gap-x-1">
      <span
        className={cn(
          "min-w-0 truncate",
          !active && "text-[color:var(--text-secondary)]",
        )}
        title={artist}
      >
        {href ? (
          <ViewLink href={href} className={NAME_LINK}>
            {artist}
          </ViewLink>
        ) : (
          artist
        )}
      </span>
      <span className={cn(muted, "shrink-0")}>
        {`· ${t.participations.roles[participation.role]}`}
      </span>
      {alerts.length > 0 && layout === "table" && (
        <AlertsIcon alerts={alerts} strong={missing} />
      )}
    </span>
  );
  const warnings = (
    <>
      {toCheck && (
        <span className={cn(caption, "flex items-start gap-1.5")}>
          <IconTriangleWarning aria-hidden className="mt-0.5 size-4 shrink-0" />
          {t.participations.sharedShort}
        </span>
      )}
      {missing && (
        <span className={WARNING}>
          <IconTriangleWarning aria-hidden className="mt-0.5 size-4 shrink-0" />
          {r.contractMissing}
        </span>
      )}
      {!dimmed && <WaiverLines waivers={participation.waivers} today={today} />}
    </>
  );
  const artistFacts: Fact[] = [
    {
      key: "contact",
      label: r.columns.contact,
      column: COLUMN.contact,
      // None and nothing to do: « — » (ContactFacts says nothing).
      node:
        facts.contact !== null || canManage ? (
          <span className="flex min-w-0 flex-col items-start">
            <ContactFacts
              projectId={projectId}
              participationId={participation.id}
              artist={artist}
              contact={facts.contact}
              canManage={canManage}
              canEditNetwork={canEditNetwork}
            />
          </span>
        ) : (
          <Empty />
        ),
    },
    ...(columns.accord
      ? [
          {
            key: "accord",
            label: r.columns.accord,
            column: COLUMN.accord,
            node: facts.accord ? (
              <AccordFacts
                accord={facts.accord}
                artist={artist}
                rate={false}
                // The gesture is in the row's « ⋯ »; the cell says it.
                planCall={
                  plansCallHere ? (
                    <span className={cn(caption, "max-w-full truncate")}>
                      {r.accord.callToPlan}
                    </span>
                  ) : undefined
                }
              />
            ) : (
              <Empty />
            ),
          },
          {
            key: "rate",
            label: r.columns.rate,
            column: COLUMN.rate,
            node: facts.accord?.rate ? (
              <span className="text-[color:var(--text-secondary)] tabular-nums">
                {facts.accord.rate}
              </span>
            ) : (
              <Empty />
            ),
          },
        ]
      : []),
    ...(columns.legal
      ? [
          {
            key: "fiche",
            label: r.columns.fiche,
            column: COLUMN.fiche,
            node: facts.fiche ? (
              <FichePill fiche={facts.fiche} bare name={artist} />
            ) : (
              <Empty />
            ),
          },
          {
            key: "contract",
            label: r.columns.contract,
            column: COLUMN.contract,
            node: facts.contract ? (
              <ContractFacts contract={facts.contract} />
            ) : (
              <Empty />
            ),
          },
        ]
      : []),
  ];
  // Its own column, after the title's facts (Maël 23/11/2026); empty:
  // « Ajouter une note » for whoever writes the title.
  const noteFacts: Fact[] = columns.notes
    ? [
        {
          key: "note",
          label: r.columns.note,
          column: COLUMN.note,
          node:
            facts.note || canManage ? (
              <NoteLine
                projectId={projectId}
                participationId={participation.id}
                artist={artist}
                note={facts.note}
                canEdit={canManage}
              />
            ) : (
              <Empty />
            ),
        },
      ]
    : [];
  const menu = columns.actions && (
    <RowMenu
      projectId={projectId}
      participation={participation}
      label={label}
      credit={credit}
      canManage={canManage}
      call={plansCallHere ? call : null}
      titleActions={titleActions}
    />
  );

  if (layout === "cards")
    return (
      <FactCard
        head={
          <span className="flex min-w-0 flex-col gap-0.5">
            {name}
            {titleLine}
            <span className="mt-1 flex">{status}</span>
            {warnings}
          </span>
        }
        menu={menu}
        facts={[...artistFacts, ...titleFacts, ...noteFacts]}
      >
        {dialogs}
      </FactCard>
    );

  return (
    <TableRow className={ROW}>
      <DataTableCell className={cn(COLUMN.artist, CELL)}>
        <span className="flex min-w-0 flex-col gap-0.5">
          {name}
          {titleLine}
        </span>
      </DataTableCell>
      <DataTableCell className={cn(COLUMN.status, CELL)}>
        {status}
      </DataTableCell>
      <FactCells facts={[...artistFacts, ...titleFacts, ...noteFacts]} />
      {columns.actions && (
        <DataTableActionsCell className={COLUMN.actions}>
          {menu}
          {dialogs}
        </DataTableActionsCell>
      )}
    </TableRow>
  );
}

/** The title's gestures, for each of its rows' « ⋯ »: add an artist,
 * rename and abandon in a modal (a gesture that asks a saisie opens one,
 * TitleDialogs), reactivate at once (nothing to ask); its page in the
 * Catalogue once it has a master. Lot 7: a title not in the Catalogue yet
 * gets its title there, provisional, at its first audio; or takes one the
 * Catalogue has. Their words say they are the title's. */
function useTitleActions({
  projectId,
  title,
  canManage,
  onDialog,
}: {
  projectId: string;
  title: RecapTitle;
  canManage: boolean;
  onDialog: (dialog: Dialog) => void;
}): RowAction[] {
  const t = fr.projectTitles;
  const a = t.recap.titleActions;
  const router = useRouter();
  const [, startTransition] = useTransition();
  if (!canManage) return [];
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
  if (title.status === "abandoned")
    return [
      {
        key: "reactivate",
        label: a.reactivate,
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
    ];
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
  return [
    {
      key: "artist",
      label: a.add,
      icon: IconUserPlus,
      onSelect: () => onDialog("add"),
    },
    {
      key: "rename",
      label: a.rename,
      icon: IconPenWriting2,
      onSelect: () => onDialog("rename"),
    },
    ...start,
    ...catalog,
    {
      key: "abandon",
      label: a.abandon,
      icon: IconBoxArchive,
      onSelect: () => onDialog("abandon"),
    },
  ];
}

/** The title's dialogs, once per title: add an artist, rename, name
 * (« Nommer », in its own words, with « Rattacher un titre du Catalogue »
 * under the field), attach, abandon. */
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

/** « ⋯ » of an artist's row: « Caler le call » when the row may plan it
 * (`call`, Maël 25/11/2026: no button in the table), the artist's gestures
 * — change its status (modal), withdraw it from the title (détacher,
 * confirmed) or bring a declined or withdrawn one back (rattacher, at once,
 * « À contacter » again) — then its title's (`titleActions`). */
function RowMenu({
  projectId,
  participation,
  label,
  credit,
  canManage,
  call,
  titleActions,
}: {
  projectId: string;
  participation: RecapParticipation;
  label: string;
  credit: Credit;
  // The artist's own gestures (not on a title abandoned).
  canManage: boolean;
  // « Caler le call »'s shared data, when the row may plan it.
  call: SharedNegotiationCall | null;
  titleActions: RowAction[];
}) {
  const t = fr.projectTitles.participations;
  const [open, setOpen] = useState<"status" | "withdraw" | "call" | null>(null);
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
  const accord = participation.recap.accord;
  const planCall: RowAction[] =
    call && accord
      ? [
          {
            key: "call",
            label: fr.dealCalls.negotiation.button,
            icon: IconPhone,
            onSelect: () => setOpen("call"),
          },
        ]
      : [];
  const own: RowAction[] = canManage
    ? [
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
      ]
    : [];

  return (
    <>
      <RowActions
        label={t.menu(participation.artist.name, label)}
        actions={[...planCall, ...own, ...titleActions]}
      />
      {call && accord && (
        <PlanCallDialog
          shared={call}
          accord={accord}
          open={open === "call"}
          onOpenChange={(next) => !next && close()}
        />
      )}
      {canManage && (
        <>
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
      )}
    </>
  );
}
