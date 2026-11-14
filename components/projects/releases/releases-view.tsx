"use client";

import { IconCalendarDays, IconPenWriting2 } from "nucleo-sharp-essential";
import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { IconDisc } from "@/components/icons";
import { OptionSelect } from "@/components/projects/option-select";
import { EmptyState } from "@/components/shell/empty-state";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableGroupRow,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { FormDialog } from "@/components/ui/form-dialog";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { normalizeUpc, upcError } from "@/lib/distribution/upc";
import { setReleaseUpc } from "@/lib/distribution/upc-actions";
import { collectiveReleases } from "@/lib/i18n/fr/collective-releases";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { distributionJourney } from "@/lib/i18n/fr/distribution-journey";
import {
  setCollectiveReleaseMode,
  setTitleReleaseDate,
} from "@/lib/release/collective-actions";
import {
  RELEASE_MODES,
  type CollectiveRelease,
  type CollectiveReleases,
  type ReleaseMode,
} from "@/lib/release/collective-rules";
import { formatShortDate } from "@/lib/release/format";
import { cn } from "@/lib/utils";

const fr = { collectiveReleases, dialogs, distributionJourney };
const t = fr.collectiveReleases;

const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]";
const muted = "text-[color:var(--text-tertiary)]";

// A project's content is 1180 px at most: four columns beside the name.
const COLUMN = {
  date: "w-32",
  upc: "w-36",
  isrc: "w-36",
  state: "w-28",
} as const;

const stateTone = {
  planned: "neutral",
  delivered: "info",
  online: "success",
} as const;

/** « Mode de sortie · Modifier », for who writes the titles. */
export function ReleaseModeButton({
  projectId,
  mode,
}: {
  projectId: string;
  mode: ReleaseMode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        aria-label={t.mode.editLabel}
        onClick={() => setOpen(true)}
      >
        {t.mode.label}
      </Button>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t.mode.title}
        description={t.mode.description}
        closeLabel={fr.dialogs.close}
      >
        {open && (
          <ModeForm
            projectId={projectId}
            mode={mode}
            onDone={() => setOpen(false)}
          />
        )}
      </FormDialog>
    </>
  );
}

function ModeForm({
  projectId,
  mode,
  onDone,
}: {
  projectId: string;
  mode: ReleaseMode;
  onDone: () => void;
}) {
  const [next, setNext] = useState<ReleaseMode>(mode);
  const { pending, error, run } = useWriteSubmit(onDone, t.mode.done);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (next === mode) return onDone();
        run(() => setCollectiveReleaseMode(projectId, next));
      }}
    >
      <OptionSelect
        id="release-mode"
        name="mode"
        label={t.mode.choice}
        required
        items={Object.fromEntries(RELEASE_MODES.map((m) => [m, t.modes[m]]))}
        defaultValue={mode}
        hint={t.modeHints[next]}
        onValueChange={(value) =>
          setNext(
            RELEASE_MODES.find((m) => m === value) ?? ("singles" as const),
          )
        }
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.mode.submit}
        onCancel={onDone}
      />
    </form>
  );
}

/**
 * The releases of a collective (lot 13): the titles' releases (singles
 * modes), the compilation (modes with one), the abandoned titles' releases
 * kept apart. Each row: date (a title's own; the compilation's is the
 * project's due date), UPC, ISRC (the title's, read in the Catalogue),
 * state, and the contracts its release waits for (lot 12). On a phone: the
 * name and the state, the rest under the name.
 */
export function ReleasesView({
  projectId,
  data,
}: {
  projectId: string;
  data: CollectiveReleases;
}) {
  if (!data.launched)
    return (
      <EmptyState
        icon={IconDisc}
        title={t.empty.notLaunched.title}
        body={t.empty.notLaunched.body}
      />
    );
  const titles = data.releases.filter(
    (r) => r.kind === "title" && !r.abandoned,
  );
  const compilation = data.releases.filter((r) => r.kind === "compilation");
  const abandoned = data.releases.filter((r) => r.abandoned);
  if (data.releases.length === 0)
    return (
      <div className="flex flex-col gap-3">
        <EmptyState
          icon={IconDisc}
          title={t.empty.none.title}
          body={t.empty.none.body}
        />
        {data.waiting.length > 0 && (
          <p className={caption}>{t.waiting(data.waiting.join(", "))}</p>
        )}
      </div>
    );
  const columns = 6;
  const rows = (list: CollectiveRelease[]) =>
    list.map((release) => (
      <ReleaseRow
        key={release.id}
        projectId={projectId}
        release={release}
        canEdit={data.canEdit && !release.abandoned}
      />
    ));
  return (
    <div className="flex flex-col gap-3">
      <DataTable>
        <DataTableHeader>
          <DataTableHead fill>{t.columns.release}</DataTableHead>
          <DataTableHead hideBelow="xl" className={COLUMN.date}>
            {t.columns.date}
          </DataTableHead>
          <DataTableHead hideBelow="xl" className={COLUMN.upc}>
            {t.columns.upc}
          </DataTableHead>
          <DataTableHead hideBelow="xl" className={COLUMN.isrc}>
            {t.columns.isrc}
          </DataTableHead>
          <DataTableHead className={COLUMN.state}>
            {t.columns.state}
          </DataTableHead>
          <DataTableActionsHead label={t.columns.actions} />
        </DataTableHeader>
        <DataTableBody>
          {titles.length > 0 && (
            <DataTableGroupRow columns={columns}>
              <GroupLabel>{t.groups.titles}</GroupLabel>
            </DataTableGroupRow>
          )}
          {rows(titles)}
          {compilation.length > 0 && (
            <DataTableGroupRow columns={columns}>
              <GroupLabel>{t.groups.compilation}</GroupLabel>
            </DataTableGroupRow>
          )}
          {rows(compilation)}
          {abandoned.length > 0 && (
            <DataTableGroupRow columns={columns}>
              <GroupLabel>{t.groups.abandoned}</GroupLabel>
            </DataTableGroupRow>
          )}
          {rows(abandoned)}
        </DataTableBody>
      </DataTable>
      {data.waiting.length > 0 && (
        <p className={caption}>{t.waiting(data.waiting.join(", "))}</p>
      )}
    </div>
  );
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[length:var(--type-body-md)] font-semibold">
      {children}
    </span>
  );
}

function ReleaseRow({
  projectId,
  release,
  canEdit,
}: {
  projectId: string;
  release: CollectiveRelease;
  canEdit: boolean;
}) {
  const [dialog, setDialog] = useState<"date" | "upc" | null>(null);
  const compilation = release.kind === "compilation";
  const date = release.date ? formatShortDate(release.date) : t.noDate;
  const upc = release.upc ?? t.noUpc;
  const isrc = compilation ? null : (release.isrc ?? t.noIsrc);
  const gaps = release.gaps
    .map((g) => (compilation ? `${g.artist} (${g.title})` : g.artist))
    .join(", ");
  const actions: RowAction[] = canEdit
    ? [
        // The compilation's date is the project's due date.
        ...(compilation
          ? []
          : [
              {
                key: "date",
                label: t.actions.date,
                icon: IconCalendarDays,
                onSelect: () => setDialog("date"),
              },
            ]),
        {
          key: "upc",
          label: t.actions.upc,
          icon: IconPenWriting2,
          onSelect: () => setDialog("upc"),
        },
      ]
    : [];
  return (
    <DataTableRow>
      <DataTableCell fill className="whitespace-normal">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span
            className={cn(
              "break-words",
              release.abandoned && "text-[color:var(--text-secondary)]",
            )}
          >
            {release.label}
          </span>
          {compilation && (
            <span className={caption}>{t.tracks(release.tracks)}</span>
          )}
          {/* Under 1280 px: the hidden columns, under the name. */}
          <span className="flex flex-wrap gap-x-3 gap-y-0.5 xl:hidden">
            <span className={caption}>
              {`${t.caption.date} : `}
              <span className="text-[color:var(--text-secondary)]">{date}</span>
            </span>
            <span className={caption}>
              {`${t.caption.upc} : `}
              <span className="text-[color:var(--text-secondary)]">{upc}</span>
            </span>
            {isrc && (
              <span className={caption}>
                {`${t.caption.isrc} : `}
                <span className="text-[color:var(--text-secondary)]">
                  {isrc}
                </span>
              </span>
            )}
          </span>
          {gaps && !release.abandoned && (
            <span
              className={cn(caption, "text-[color:var(--tone-warning-fg)]")}
            >
              {t.gaps(gaps)}
            </span>
          )}
        </span>
      </DataTableCell>
      <DataTableCell hideBelow="xl" className={COLUMN.date}>
        <span className="flex flex-col">
          <span className={cn(!release.date && muted)}>{date}</span>
          {compilation && <span className={caption}>{t.dueDate}</span>}
        </span>
      </DataTableCell>
      <DataTableCell hideBelow="xl" className={COLUMN.upc}>
        <span className={cn("tabular-nums", !release.upc && muted)}>{upc}</span>
      </DataTableCell>
      <DataTableCell hideBelow="xl" className={COLUMN.isrc}>
        {isrc ? (
          <span className={cn("tabular-nums", !release.isrc && muted)}>
            {isrc}
          </span>
        ) : (
          <span className={muted}>{EMPTY_CELL}</span>
        )}
      </DataTableCell>
      <DataTableCell className={COLUMN.state}>
        <StatusBadge tone={stateTone[release.state]} size="sm">
          {t.states[release.state]}
        </StatusBadge>
      </DataTableCell>
      <DataTableActionsCell>
        <RowActions label={t.actions.label(release.label)} actions={actions} />
        <FormDialog
          open={dialog === "date"}
          onOpenChange={(open) => !open && setDialog(null)}
          title={t.date.title(release.label)}
          description={t.date.description}
          closeLabel={fr.dialogs.close}
        >
          {dialog === "date" && (
            <DateForm
              projectId={projectId}
              release={release}
              onDone={() => setDialog(null)}
            />
          )}
        </FormDialog>
        <FormDialog
          open={dialog === "upc"}
          onOpenChange={(open) => !open && setDialog(null)}
          title={t.upc.title(release.label)}
          description={t.upc.description}
          closeLabel={fr.dialogs.close}
        >
          {dialog === "upc" && (
            <UpcForm
              projectId={projectId}
              release={release}
              onDone={() => setDialog(null)}
            />
          )}
        </FormDialog>
      </DataTableActionsCell>
    </DataTableRow>
  );
}

function DateForm({
  projectId,
  release,
  onDone,
}: {
  projectId: string;
  release: CollectiveRelease;
  onDone: () => void;
}) {
  const { pending, error, run } = useWriteSubmit(onDone, t.date.done);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const date = String(
          new FormData(event.currentTarget).get("date") ?? "",
        );
        run(() => setTitleReleaseDate(projectId, release.id, date));
      }}
    >
      <Field
        id={`release-date-${release.id}`}
        name="date"
        type="date"
        label={t.date.label}
        defaultValue={release.date ?? ""}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.date.submit}
        onCancel={onDone}
      />
    </form>
  );
}

function UpcForm({
  projectId,
  release,
  onDone,
}: {
  projectId: string;
  release: CollectiveRelease;
  onDone: () => void;
}) {
  const u = fr.distributionJourney.upc;
  const [fieldError, setFieldError] = useState<string | null>(null);
  const { pending, error, run } = useWriteSubmit(onDone, u.saved);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const value = String(
          new FormData(event.currentTarget).get("upc") ?? "",
        );
        const upc = normalizeUpc(value);
        const refused = upc ? upcError(upc) : null;
        if (refused) return setFieldError(u.errors[refused]);
        setFieldError(null);
        run(() => setReleaseUpc(projectId, value, release.id));
      }}
    >
      <Field
        id={`release-upc-${release.id}`}
        name="upc"
        label={t.upc.label}
        inputMode="numeric"
        defaultValue={release.upc ?? ""}
        error={fieldError ?? undefined}
        onChange={() => setFieldError(null)}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.upc.submit}
        onCancel={onDone}
      />
    </form>
  );
}
