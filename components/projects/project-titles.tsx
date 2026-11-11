"use client";

import {
  IconArrowDottedRotateAnticlockwise,
  IconBoxArchive,
  IconPenWriting2,
  IconTriangleWarning,
} from "nucleo-sharp-essential";
import { useState, useTransition } from "react";

import { Field } from "@/components/auth/field";
import { FieldError, FormMessage } from "@/components/auth/form-message";
import { IconUserPlus } from "@/components/icons";
import { OptionSelect } from "@/components/projects/option-select";
import { ContentCard } from "@/components/shell/content-card";
import { Button } from "@/components/ui/button";
import { ChipChoice } from "@/components/ui/chip-choice";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { Label } from "@/components/ui/label";
import { ReasonForm } from "@/components/ui/reason-form";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { SearchSelect } from "@/components/ui/search-select";
import { toast } from "@/components/ui/toast";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { demos } from "@/lib/i18n/fr/demos";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { projectTitles } from "@/lib/i18n/fr/project-titles";
import {
  addTitleParticipation,
  setTitleParticipationStatus,
} from "@/lib/projects/participation-actions";
import {
  isActiveParticipation,
  PARTICIPATION_STATUSES,
  projectArtists,
  type ParticipationRole,
  type ParticipationStatus,
  type TitleParticipation,
} from "@/lib/projects/participation-rules";
import {
  abandonProjectTitle,
  addProjectTitle,
  reactivateProjectTitle,
  renameProjectTitle,
} from "@/lib/projects/title-actions";
import {
  creditModeOf,
  projectTitleLabel,
  type ProjectTitle,
} from "@/lib/projects/title-rules";
import { formatShortDay } from "@/lib/utils/day";
import { cn } from "@/lib/utils";

const fr = { demos, dialogs, projectTitles };

const caption =
  "block text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]";

const NO_MASTER = "none";

/** How a confirmation credits a title (creditModeOf), and the warning of
 * a title a simple project shares (« Crédits à vérifier au Catalogue : ce
 * titre est aussi dans le projet … », décision 10). */
type Credit = { mode: "now" | "later" | "manual"; shared: string };

function creditOf(title: ProjectTitle): Credit {
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

const labelOf = (title: ProjectTitle) =>
  projectTitleLabel({
    position: title.position,
    workingTitle: title.workingTitle,
    masterTitle: title.master?.title ?? null,
  });

/** Under the name: why it was abandoned, else where it stands in the
 * Catalogue (its maquette's status when it is one). */
function detailOf(title: ProjectTitle, label: string): string {
  const t = fr.projectTitles;
  if (title.status === "abandoned" && title.abandonedAt && title.abandonReason)
    return t.abandonedOn(
      formatShortDay(title.abandonedAt, { bare: true }),
      title.abandonReason,
    );
  if (!title.master) return t.notInCatalog;
  const demo = title.master.demoStatus
    ? fr.demos.badge(fr.demos.statuses[title.master.demoStatus])
    : null;
  if (label === title.master.title) return demo ?? t.inCatalog;
  return demo
    ? t.catalogDemo(title.master.title, demo)
    : t.catalog(title.master.title);
}

/** Who may be added to a title: the Catalogue's artists, less those already
 * on it and the project's main artist (credited on every title, never a
 * participation). */
type Artists = {
  // id → name, every active artist of the Catalogue.
  options: Record<string, string>;
  mainArtistId: string | null;
};

/**
 * The titles of a collective project (docs/pds-mic-plan.md, lots 2 and 3),
 * the minimal list on its overview until the « Titres et artistes » view
 * (lot 6): « Artistes du projet » (computed: participations neither declined
 * nor withdrawn, plus the credits of the active titles), then one line per
 * title — its name or « Titre 3 · sans nom », where it stands in the
 * Catalogue, its status in words (the overview shows no pills) — and under
 * it its artists (role, status). For whoever writes the project, « Ajouter
 * un titre » and each title's « ⋯ »: add an artist, rename, abandon (with
 * its reason), reactivate; each artist's « ⋯ »: change its status. An
 * abandoned title stays listed, after the others, its artists with it.
 */
export function ProjectTitles({
  projectId,
  titles,
  canManage,
  masterOptions,
  artists,
}: {
  projectId: string;
  titles: ProjectTitle[];
  canManage: boolean;
  // The Catalogue's titles not in the project yet: id → « Titre · Artistes ».
  masterOptions: Record<string, string>;
  artists: Artists;
}) {
  const t = fr.projectTitles;
  const ofProject = projectArtists(titles);
  return (
    <ContentCard title={t.title} quietTitle className="p-6">
      {ofProject.length > 0 && (
        <p className={cn(caption, "-mt-2")}>
          {t.participations.ofProject(
            ofProject.map((artist) => artist.name).join(", "),
          )}
        </p>
      )}
      {titles.length === 0 ? (
        <p className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] text-[color:var(--text-secondary)]">
          {t.empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {titles.map((title) => (
            <TitleRow
              key={title.id}
              projectId={projectId}
              title={title}
              canManage={canManage}
              artists={artists}
            />
          ))}
        </ul>
      )}
      {canManage && (
        <div>
          <DialogButton
            label={t.add.button}
            title={t.add.title}
            description={t.add.description}
          >
            {(close) => (
              <AddTitleForm
                projectId={projectId}
                masterOptions={masterOptions}
                onDone={close}
              />
            )}
          </DialogButton>
        </div>
      )}
    </ContentCard>
  );
}

const rowGrid = "grid grid-cols-[minmax(0,1fr)_auto_2rem] items-center gap-3.5";

function TitleRow({
  projectId,
  title,
  canManage,
  artists,
}: {
  projectId: string;
  title: ProjectTitle;
  canManage: boolean;
  artists: Artists;
}) {
  const t = fr.projectTitles;
  const label = labelOf(title);
  const abandoned = title.status === "abandoned";
  const credit = creditOf(title);
  return (
    <li className="flex flex-col gap-1 py-2">
      <div className={rowGrid}>
        <TitleHead title={title} label={label} abandoned={abandoned} />
        <span className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] text-[color:var(--text-secondary)]">
          {t.statuses[title.status]}
        </span>
        <span className="flex justify-end">
          {canManage && (
            <TitleActions
              projectId={projectId}
              title={title}
              label={label}
              artists={artists}
            />
          )}
        </span>
      </div>
      {/* A simple project shares its master: no automatic credit, said
          where the title is (décision 10); moot once abandoned. */}
      {credit.mode === "manual" && !abandoned && (
        <ToneCallout tone="warning" className="my-1">
          {`${credit.shared}.`}
        </ToneCallout>
      )}
      {title.participations.length > 0 && (
        <ul className="flex flex-col">
          {title.participations.map((participation) => (
            <ParticipationRow
              key={participation.id}
              projectId={projectId}
              participation={participation}
              label={label}
              credit={credit}
              // Greyed with its title, and not edited: reactivate it first.
              dimmed={abandoned}
              canManage={canManage && !abandoned}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function TitleHead({
  title,
  label,
  abandoned,
}: {
  title: ProjectTitle;
  label: string;
  abandoned: boolean;
}) {
  return (
    <span className="min-w-0">
      <span
        className={cn(
          "line-clamp-2 block text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] break-words",
          abandoned && "text-[color:var(--text-secondary)]",
        )}
      >
        {label}
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
    </span>
  );
}

/** An artist on a title, under it: its name and role, its participation's
 * status in words; declined or withdrawn, or on an abandoned title, still
 * listed, greyed. */
function ParticipationRow({
  projectId,
  participation,
  label,
  credit,
  dimmed,
  canManage,
}: {
  projectId: string;
  participation: TitleParticipation;
  label: string;
  credit: Credit;
  // Its title is abandoned.
  dimmed: boolean;
  canManage: boolean;
}) {
  const t = fr.projectTitles.participations;
  const active = isActiveParticipation(participation.status) && !dimmed;
  // Confirmed on a title a simple project shares: its credits were not
  // written, they are to check by hand.
  const toCheck =
    credit.mode === "manual" && participation.status === "confirmed" && !dimmed;
  return (
    <li className={cn(rowGrid, "py-1 pl-4")}>
      <span className="min-w-0">
        {/* Wraps rather than cut, as a title's detail: on a phone the role
            was lost. */}
        <span className="line-clamp-2 block text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] break-words">
          <span className={cn(!active && "text-[color:var(--text-secondary)]")}>
            {participation.artist.name}
          </span>
          <span className="text-[color:var(--text-tertiary)]">
            {` · ${t.roles[participation.role]}`}
          </span>
        </span>
        {/* Outside the two lines of the name: never cut. */}
        {toCheck && (
          <span className={cn(caption, "flex items-start gap-1.5")}>
            <IconTriangleWarning
              aria-hidden
              className="mt-0.5 size-4 shrink-0"
            />
            {t.sharedShort}
          </span>
        )}
      </span>
      <span className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] text-[color:var(--text-secondary)]">
        {t.statuses[participation.status]}
      </span>
      <span className="flex justify-end">
        {canManage && (
          <ParticipationActions
            projectId={projectId}
            participation={participation}
            label={label}
            credit={credit}
          />
        )}
      </span>
    </li>
  );
}

/** « ⋯ » of an artist on a title: change its status, in a modal. */
function ParticipationActions({
  projectId,
  participation,
  label,
  credit,
}: {
  projectId: string;
  participation: TitleParticipation;
  label: string;
  credit: Credit;
}) {
  const t = fr.projectTitles.participations;
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <>
      <RowActions
        label={t.menu(participation.artist.name, label)}
        actions={[
          {
            key: "status",
            label: t.status.action,
            icon: IconPenWriting2,
            onSelect: () => setOpen(true),
          },
        ]}
      />
      <FormDialog
        open={open}
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
    </>
  );
}

function ParticipationStatusForm({
  projectId,
  participation,
  onDone,
}: {
  projectId: string;
  participation: TitleParticipation;
  onDone: () => void;
}) {
  const t = fr.projectTitles.participations;
  const { pending, error, run } = useWriteSubmit(onDone, t.status.done);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const status = String(
          new FormData(event.currentTarget).get("status") ?? "",
        );
        run(() =>
          setTitleParticipationStatus({
            projectId,
            participationId: participation.id,
            status,
          }),
        );
      }}
    >
      <OptionSelect
        name="status"
        label={t.status.label}
        required
        items={Object.fromEntries(
          PARTICIPATION_STATUSES.map((status) => [status, t.statuses[status]]),
        )}
        defaultValue={participation.status}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.status.submit}
        onCancel={onDone}
      />
    </form>
  );
}

/** « ⋯ » of a title: add an artist, rename and abandon in a modal (a
 * gesture that asks a saisie opens one), reactivate at once (nothing to
 * ask). */
function TitleActions({
  projectId,
  title,
  label,
  artists,
}: {
  projectId: string;
  title: ProjectTitle;
  label: string;
  artists: Artists;
}) {
  const t = fr.projectTitles;
  const credit = creditOf(title);
  const [open, setOpen] = useState<"artist" | "rename" | "abandon" | null>(
    null,
  );
  const [, startTransition] = useTransition();
  const close = () => setOpen(null);

  const actions: RowAction[] =
    title.status === "abandoned"
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
        ]
      : [
          {
            key: "artist",
            label: t.participations.add.action,
            icon: IconUserPlus,
            onSelect: () => setOpen("artist"),
          },
          {
            key: "rename",
            label: t.rename.action,
            icon: IconPenWriting2,
            onSelect: () => setOpen("rename"),
          },
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
      <FormDialog
        open={open === "artist"}
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
          onDone={close}
        />
      </FormDialog>
      <FormDialog
        open={open === "rename"}
        onOpenChange={(next) => !next && close()}
        title={t.rename.title}
        description={t.rename.description}
        closeLabel={fr.dialogs.close}
      >
        <RenameTitleForm projectId={projectId} title={title} onDone={close} />
      </FormDialog>
      <FormDialog
        open={open === "abandon"}
        onOpenChange={(next) => !next && close()}
        title={t.abandon.title(label)}
        // Only a maquette in draft or in development becomes « abandonnée »;
        // a validated one keeps its status (décision 8).
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
  );
}

// At the addition, the statuses that open a participation; declined and
// withdrawn come later, by « Changer le statut ».
const START_STATUSES = ["proposed", "invited", "confirmed"] as const;

/** « Ajouter un artiste » to a title: the artist (searched among the
 * Catalogue's), its role (featuring by default: a guest), where it stands
 * (proposed by default). Nothing chosen for the artist: said in red at the
 * first try, never a disabled button. */
function AddParticipationForm({
  projectId,
  title,
  artists,
  onDone,
}: {
  projectId: string;
  title: ProjectTitle;
  artists: Artists;
  onDone: () => void;
}) {
  const t = fr.projectTitles.participations;
  const [artistId, setArtistId] = useState("");
  const [role, setRole] = useState<ParticipationRole>("featuring");
  const [status, setStatus] = useState<ParticipationStatus>("proposed");
  const [missing, setMissing] = useState(false);
  const { pending, error, run } = useWriteSubmit(onDone, t.add.done);
  const taken = new Set(title.participations.map((p) => p.artist.id));
  const options = Object.fromEntries(
    Object.entries(artists.options).filter(
      ([id]) => id !== artists.mainArtistId && !taken.has(id),
    ),
  );

  if (Object.keys(options).length === 0)
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[length:var(--type-body-md)] leading-[var(--type-body-md-lh)] text-[color:var(--text-secondary)]">
          {t.add.noArtist}
        </p>
        <div>
          <Button type="button" variant="outline" size="lg" onClick={onDone}>
            {fr.dialogs.close}
          </Button>
        </div>
      </div>
    );

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        setMissing(!artistId);
        // The field in red takes the focus (docs/DESIGN.md « Manques à la
        // validation »).
        if (!artistId)
          return void document.getElementById("participation-artist")?.focus();
        run(() =>
          addTitleParticipation({
            projectId,
            titleId: title.id,
            artistId,
            role,
            status,
          }),
        );
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="participation-artist" required>
          {t.add.artist}
        </Label>
        <SearchSelect
          id="participation-artist"
          label={t.add.artist}
          options={options}
          value={artistId}
          onChange={(next) => {
            setArtistId(next);
            setMissing(false);
          }}
          placeholder={t.add.artistPlaceholder}
          searchPlaceholder={t.add.artistSearch}
          emptyLabel={t.add.artistEmpty}
          required
          invalid={missing}
          describedBy={missing ? "participation-artist-error" : undefined}
          fill
        />
        <FieldError id="participation-artist-error">
          {missing ? t.add.artistRequired : undefined}
        </FieldError>
      </div>
      <ChipChoice
        name="role"
        legend={t.add.role}
        required
        options={[
          { value: "featuring", label: t.roles.featuring },
          { value: "main", label: t.roles.main },
        ]}
        value={role}
        onChange={(next) => next && setRole(next)}
        fill
      />
      <ChipChoice
        name="status"
        legend={t.add.status}
        required
        options={START_STATUSES.map((value) => ({
          value,
          label: t.statuses[value],
        }))}
        value={status as (typeof START_STATUSES)[number]}
        onChange={(next) => next && setStatus(next)}
        fill
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.add.submit}
        onCancel={onDone}
      />
    </form>
  );
}

function AddTitleForm({
  projectId,
  masterOptions,
  onDone,
}: {
  projectId: string;
  masterOptions: Record<string, string>;
  onDone: () => void;
}) {
  const t = fr.projectTitles.add;
  const [masterId, setMasterId] = useState(NO_MASTER);
  const { pending, error, run } = useWriteSubmit(onDone, t.done);
  const options = { [NO_MASTER]: t.noMaster, ...masterOptions };
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const name = String(
          new FormData(event.currentTarget).get("workingTitle") ?? "",
        ).trim();
        run(() =>
          addProjectTitle({
            projectId,
            workingTitle: name || null,
            masterId: masterId === NO_MASTER ? null : masterId,
          }),
        );
      }}
    >
      <Field name="workingTitle" label={t.name} maxLength={200} autoFocus />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="project-title-master">{t.master}</Label>
        <SearchSelect
          id="project-title-master"
          label={t.master}
          options={options}
          value={masterId}
          onChange={setMasterId}
          searchPlaceholder={t.masterSearch}
          emptyLabel={t.masterEmpty}
          fill
        />
        <p className="text-caption text-muted-foreground">{t.masterHint}</p>
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.submit}
        onCancel={onDone}
      />
    </form>
  );
}

function RenameTitleForm({
  projectId,
  title,
  onDone,
}: {
  projectId: string;
  title: ProjectTitle;
  onDone: () => void;
}) {
  const t = fr.projectTitles.rename;
  const { pending, error, run } = useWriteSubmit(onDone, t.done);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const name = String(
          new FormData(event.currentTarget).get("workingTitle") ?? "",
        ).trim();
        run(() =>
          renameProjectTitle({
            projectId,
            titleId: title.id,
            workingTitle: name,
          }),
        );
      }}
    >
      <Field
        name="workingTitle"
        label={fr.projectTitles.add.name}
        defaultValue={title.workingTitle ?? ""}
        // Left empty, the title takes its master's name back: said here.
        placeholder={title.master?.title}
        maxLength={200}
        autoFocus
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.submit}
        onCancel={onDone}
      />
    </form>
  );
}
