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
  DataTableLink,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { FilterChip } from "@/components/ui/filter-chip";
import { FormDialog } from "@/components/ui/form-dialog";
import { ReasonForm } from "@/components/ui/reason-form";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
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
import {
  contractGap,
  titleMasterLabel,
  titleMasterStatus,
} from "@/lib/projects/title-board-rules";
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

/** Which columns the table has, in the space of a project's page (1180 px:
 * 4 columns besides the name, docs/pds-mic-resume.md): Statut and Contact
 * always; Accord when the reader sees deals (dealReach, lot 6); Juridique
 * with manage_legal. */
type Columns = { accord: boolean; legal: boolean };

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

// The columns of the artists' rows, shown from 1280 px; under it, said
// under the name (`inline`).
const COLUMN = {
  status: "w-28",
  accord: "w-48 whitespace-normal",
  contact: "w-48 whitespace-normal",
  legal: "w-48 whitespace-normal",
} as const;

// The name's cell wraps (the table's cells do not): its lines under the
// name — detail, note, warning, the hidden columns — never widen the table
// past a phone's screen; the name itself stays on one line (DataTableLink).
const NAME_CELL = "whitespace-normal";

/** Under 1280 px, a hidden column under the name: its label, its facts
 * (still links and buttons). */
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

/** Space between two titles: their groups apart without a rule
 * (no-dividers), the table kept as one so that its columns stay aligned. */
function GroupGap({ columns }: { columns: number }) {
  return (
    <tbody aria-hidden>
      <tr>
        <td colSpan={columns} className="h-3 p-0" />
      </tr>
    </tbody>
  );
}

/**
 * « Titres et artistes » of a collective project, read as the team's Excel
 * (retours d'Ibé du 18/11/2026, lot 2; lot 6 of docs/pds-mic-plan.md): one
 * DataTable, one group per title — its row on the soft band (its label with
 * its guests, its status, « Nommer » while it has no name, its facts in
 * words: Mix, Beatmaker, Sortie, Distribution), then its artists — with
 * space between two groups and no rule. An artist's row: name and role,
 * its note under it; Statut (« À contacter », « Contacté », « D'accord »);
 * Accord (deal, rate, call; « Caler le call »); Contact (number, « Appeler
 * », « WhatsApp »); Juridique (fiche, contract). « Le tableau lit, les
 * modules font »: each cell leads to its module; only the contact, the
 * release and the note are edited here. Counters on top filter the
 * artists by status. The abandoned titles come last, under « Abandonnés ».
 * For whoever writes the project, each « ⋯ » as in lot 6. Under 1280 px,
 * the name and the status, the other columns under the name (still links
 * and buttons); on a phone, the status too.
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
  };
  // Every column, hidden ones included (a gap or a group row spans them).
  const allColumns = dataColumnCount(columns) + 2;

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
  const rows = (list: typeof groups) =>
    list.map(({ title, participations }) => (
      <Fragment key={title.id}>
        <GroupGap columns={allColumns} />
        <TitleGroup
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
        <DataTable>
          <DataTableHeader>
            <DataTableHead fill>{t.columns.title}</DataTableHead>
            {/* On a phone, the status under the name (room for the rest). */}
            <DataTableHead hideBelow="sm" className={COLUMN.status}>
              {r.columns.status}
            </DataTableHead>
            {columns.accord && (
              <DataTableHead hideBelow="xl" className={COLUMN.accord}>
                {r.columns.accord}
              </DataTableHead>
            )}
            <DataTableHead hideBelow="xl" className={COLUMN.contact}>
              {r.columns.contact}
            </DataTableHead>
            {columns.legal && (
              <DataTableHead hideBelow="xl" className={COLUMN.legal}>
                {r.columns.legal}
              </DataTableHead>
            )}
            <DataTableActionsHead label={t.columns.actions} />
          </DataTableHeader>
          {rows(live)}
          {abandoned.length > 0 && (
            <>
              <GroupGap columns={allColumns} />
              <DataTableBody>
                <DataTableGroupRow columns={allColumns}>
                  <span className="text-[length:var(--type-body-md)] font-semibold">
                    {t.abandonedGroup}
                    <span className="ml-1.5 font-medium text-[color:var(--text-tertiary)]">
                      {abandoned.length}
                    </span>
                  </span>
                </DataTableGroupRow>
              </DataTableBody>
            </>
          )}
          {rows(abandoned)}
        </DataTable>
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
};

/** A title's group, its own <tbody>: its row on the soft band, then its
 * artists, or « Aucun artiste invité » (with « Ajouter un artiste » for
 * whoever writes). Holds the title's dialogs (« ⋯ », « Nommer ») and its
 * release, saved at the click and shown at once. */
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
  const facts = (inline: boolean) => (
    <TitleFacts
      title={title}
      label={label}
      links={props.links}
      release={releaseValueOf(release)}
      releasePending={releasePending}
      onRelease={pickRelease}
      canEdit={canManage && !abandoned}
      inline={inline}
    />
  );

  return (
    <DataTableBody>
      <TitleRow
        {...props}
        label={label}
        facts={facts}
        onDialog={setDialog}
        actions={
          <TitleActions
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
        }
      />
      {participations.map((participation) => (
        <ParticipationRow
          key={participation.id}
          projectId={projectId}
          participation={participation}
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
      {title.participations.length === 0 && !abandoned && (
        <DataTableRow>
          {/* Over the status column too (no participation, no status):
              the button never widens the table past a phone's screen. */}
          <DataTableCell fill className={NAME_CELL} colSpan={2}>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-2 pl-3 sm:pl-6">
              <span className={muted}>{fr.projectTitles.board.noArtist}</span>
              {canManage && Object.keys(props.artists.options).length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="relative z-10"
                  onClick={() => setDialog("add")}
                >
                  {fr.projectTitles.participations.add.action}
                </Button>
              )}
            </span>
          </DataTableCell>
          <DataTableCell hideBelow="xl" colSpan={dataColumnCount(columns) - 1}>
            {null}
          </DataTableCell>
          <DataTableActionsCell>{null}</DataTableActionsCell>
        </DataTableRow>
      )}
    </DataTableBody>
  );
}

/** A title's facts in words, apart from its artists' columns (Ibé 18/11,
 * 36:52: « pas aligné »): Mix (its Master), Beatmaker (their fiche, nothing
 * without one), Sortie (oui / non / pas décidé, edited here), Distribution
 * (once the project has one). */
function TitleFacts({
  title,
  label,
  links,
  release,
  releasePending,
  onRelease,
  canEdit,
  inline,
}: {
  title: RecapTitle;
  label: string;
  links: BoardLinks;
  release: ReleaseValue;
  releasePending: boolean;
  onRelease: (value: ReleaseValue) => void;
  canEdit: boolean;
  inline: boolean;
}) {
  const f = fr.projectTitles.recap.facts;
  const abandoned = title.status === "abandoned";
  // An abandoned title is out of the Master (lot 9): no state there.
  const mix = abandoned ? null : titleMasterLabel(title.masterState);
  const mixStatus = abandoned ? null : titleMasterStatus(title.masterState);
  const masterHref =
    title.master && links.master && !abandoned
      ? `${links.master}?titre=${title.master.id}`
      : null;
  const distribution = links.distribution?.[title.id] ?? null;
  const fact = (key: string, name: string, value: ReactNode) => (
    <span key={key} className="flex min-w-0 flex-wrap items-center gap-2">
      <span className={caption}>{name}</span>
      {value}
    </span>
  );
  return (
    <span
      className={cn(
        "flex min-w-0 flex-wrap items-center",
        inline ? "gap-x-4 gap-y-2" : "gap-x-6 gap-y-2",
      )}
    >
      {fact(
        "mix",
        f.mix,
        <MixPill label={mix} status={mixStatus} href={masterHref} />,
      )}
      {title.recap.beatmakers.length > 0 &&
        fact(
          "beatmaker",
          f.beatmaker,
          title.recap.beatmakers.map((person) => (
            <span
              key={person.contactId ?? person.name}
              className="flex min-w-0 items-center gap-1.5"
            >
              <span className="truncate text-[color:var(--text-secondary)]">
                {person.name}
              </span>
              {person.fiche && <FichePill fiche={person.fiche} />}
            </span>
          )),
        )}
      {fact(
        "release",
        f.release,
        <ReleaseChoice
          label={label}
          value={release}
          canEdit={canEdit}
          pending={releasePending}
          onPick={onRelease}
        />,
      )}
      {links.distribution !== null &&
        fact(
          "distribution",
          f.distribution,
          distribution ? (
            <ViewLink href={distribution.href} className={PILL_LINK}>
              <StatusBadge tone={distribution.tone} size="sm">
                {distribution.label}
              </StatusBadge>
            </ViewLink>
          ) : (
            <span className={muted}>{EMPTY_CELL}</span>
          ),
        )}
    </span>
  );
}

function TitleRow({
  title,
  columns,
  canManage,
  canReadLegal,
  links,
  today,
  label,
  facts,
  onDialog,
  actions,
}: GroupProps & {
  label: string;
  facts: (inline: boolean) => ReactNode;
  onDialog: (dialog: Dialog) => void;
  actions: ReactNode;
}) {
  const t = fr.projectTitles;
  const abandoned = title.status === "abandoned";
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
  const name = (small: boolean) => (
    <span className="flex min-w-0 flex-col gap-1">
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={cn(
            "flex min-w-0 font-semibold",
            abandoned && "text-[color:var(--text-secondary)]",
          )}
        >
          {/* The title's Master, once it has a master, open on this title
              (lot 8); an abandoned title is out of it (lot 9). */}
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
        <StatusBadge tone={projectTitleTone[title.status]} size="sm">
          {t.statuses[title.status]}
        </StatusBadge>
        {/* Ibé 18/11 (37:03): « il faut les mettre dans le catalogue
            d'abord ? »: the title is named here. */}
        {canManage && !abandoned && isUnnamed(title) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="relative z-10"
            aria-label={t.recap.name.title(label)}
            onClick={() => onDialog("name")}
          >
            {t.recap.name.action}
          </Button>
        )}
      </span>
      {/* Wraps rather than cut: on a phone « Maquette · En développement »
          lost its status. */}
      <span
        className={cn(caption, "line-clamp-2 break-words")}
        // The whole reason of an abandonment, when two lines cut it.
        title={abandoned ? (title.abandonReason ?? undefined) : undefined}
      >
        {detailOf(title, label)}
      </span>
      {/* A simple project shares its master: no automatic credit, said
          where the title is (décision 10). */}
      {shared && (
        <span
          className={cn(
            caption,
            "flex items-start gap-1.5 text-[color:var(--tone-warning-fg)]",
          )}
        >
          <IconTriangleWarning aria-hidden className="mt-0.5 size-4 shrink-0" />
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
          <IconTriangleWarning aria-hidden className="mt-0.5 size-4 shrink-0" />
          {fr.participationWaivers.titleMissing(missing.join(", "))}
        </span>
      )}
      {/* Under 1280 px, its facts under its name. */}
      {small && <span className="mt-1">{facts(true)}</span>}
    </span>
  );
  return (
    <DataTableRow className="bg-[var(--surface-soft)] hover:bg-[var(--surface-soft)]">
      {/* Under 1280 px, over the status column too (it holds the artists'
          statuses, nothing of the title's): its facts fit under its name.
          From 1280 px, the name alone, then its facts across its artists'
          columns, in words. One of the two name cells is shown. */}
      <DataTableCell fill colSpan={2} className={cn(NAME_CELL, "xl:hidden")}>
        {name(true)}
      </DataTableCell>
      <DataTableCell fill hideBelow="xl" className={NAME_CELL}>
        {name(false)}
      </DataTableCell>
      <DataTableCell
        hideBelow="xl"
        colSpan={dataColumnCount(columns)}
        className="whitespace-normal"
      >
        {facts(false)}
      </DataTableCell>
      <DataTableActionsCell>{actions}</DataTableActionsCell>
    </DataTableRow>
  );
}

/** An artist on a title, under it: name and role, its note; Statut,
 * Accord, Contact, Juridique. The row opens the person's démarche in the
 * Juridique, else the deal. */
function ParticipationRow({
  projectId,
  participation,
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
  const contact = (inline: boolean) => (
    <ContactFacts
      projectId={projectId}
      participationId={participation.id}
      artist={artist}
      contact={facts.contact}
      canManage={canManage}
      canEditNetwork={canEditNetwork}
      inline={inline}
    />
  );
  const legal = (inline: boolean) => (
    <LegalFacts fiche={facts.fiche} contract={facts.contract} inline={inline} />
  );

  return (
    <DataTableRow>
      <DataTableCell fill className={NAME_CELL}>
        {/* Under its title (the row's inset holds the cell's own padding). */}
        <span className="flex min-w-0 flex-col gap-0.5 pl-3 sm:pl-6">
          {/* The role goes under the name when the line is too short (a
              phone), rather than cutting the name. */}
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-1">
            <span
              className={cn(
                "flex min-w-0",
                !active && "text-[color:var(--text-secondary)]",
              )}
            >
              <DataTableLink
                href={facts.contract?.href ?? facts.accord?.href ?? null}
              >
                {artist}
              </DataTableLink>
            </span>
            <span className={cn(muted, "hidden shrink-0 sm:inline")}>
              {`· ${t.participations.roles[participation.role]}`}
            </span>
          </span>
          {/* On a phone, the role and the status under the name. */}
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:hidden">
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
          {/* Under 1280 px, the hidden columns, still links and buttons. */}
          <span className="mt-1.5 flex flex-col gap-1.5 xl:hidden">
            {columns.accord && (
              <StackedFact label={r.columns.accord}>{accord(true)}</StackedFact>
            )}
            <StackedFact label={r.columns.contact}>{contact(true)}</StackedFact>
            {columns.legal && (
              <StackedFact label={r.columns.legal}>{legal(true)}</StackedFact>
            )}
          </span>
        </span>
      </DataTableCell>
      <DataTableCell hideBelow="sm" className={COLUMN.status}>
        <ContactStatePill status={participation.status} />
      </DataTableCell>
      {columns.accord && (
        <DataTableCell hideBelow="xl" className={COLUMN.accord}>
          {accord(false)}
        </DataTableCell>
      )}
      <DataTableCell hideBelow="xl" className={COLUMN.contact}>
        {contact(false)}
      </DataTableCell>
      {columns.legal && (
        <DataTableCell hideBelow="xl" className={COLUMN.legal}>
          {legal(false)}
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
 * ask); its page in the Catalogue for everyone, once it has a master.
 * « Nommer » (the title's row) opens the rename form in its own words,
 * with « Rattacher un titre du Catalogue » under the field. */
function TitleActions({
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
  const router = useRouter();
  const [, startTransition] = useTransition();
  const close = () => onDialog(null);
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
  const provisional = title.master?.provisional
    ? t.rename.descriptionProvisional
    : undefined;

  return (
    <>
      <RowActions label={t.menu(label)} actions={actions} />
      {canManage && (
        <>
          <FormDialog
            open={dialog === "add"}
            onOpenChange={(next) => !next && close()}
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
              invitedOn={invitedOn}
              onDone={close}
            />
          </FormDialog>
          <FormDialog
            open={dialog === "rename"}
            onOpenChange={(next) => !next && close()}
            title={t.rename.title}
            description={provisional ?? t.rename.description}
            closeLabel={fr.dialogs.close}
          >
            <RenameTitleForm
              projectId={projectId}
              title={title}
              onDone={close}
            />
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
            open={dialog === "abandon"}
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
