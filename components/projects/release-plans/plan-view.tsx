"use client";

import {
  IconEyeOpen,
  IconImage,
  IconLink,
  IconPenWriting2,
  IconPlus,
  IconTrash,
  IconXmark,
} from "nucleo-sharp-essential";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";

import { IconCopy, IconDownload } from "@/components/icons";
import { PageSection } from "@/components/shell/page-section";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableActionsCell,
  DataTableActionsHead,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  EMPTY_CELL,
} from "@/components/ui/data-table";
import { FactList } from "@/components/ui/fact-list";
import { FormDialog } from "@/components/ui/form-dialog";
import { PhaseStrip } from "@/components/ui/phase-strip";
import { RowActions, type RowAction } from "@/components/ui/row-actions";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "@/components/ui/toast";
import { ToneCallout } from "@/components/ui/tone-callout";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { routes } from "@/lib/auth/redirects";
import { collectiveReleases } from "@/lib/i18n/fr/collective-releases";
import { dialogs } from "@/lib/i18n/fr/dialogs";
import { titleReleasePlans } from "@/lib/i18n/fr/title-release-plans";
import {
  revokeTitlePlanLink,
  saveTitlePlan,
  shareTitlePlanVersion,
} from "@/lib/projects/title-plan/actions";
import type { PlanAction } from "@/lib/projects/title-plan/build";
import {
  hasChanges,
  SHAREABLE_STATUSES,
  statusStep,
  TITLE_PLAN_STATUSES,
  type TimelineEntry,
} from "@/lib/projects/title-plan/model";
import type {
  PlanVisual,
  TitlePlanDetail,
} from "@/lib/projects/title-plan/queries";
import { planStatusTone } from "@/lib/projects/title-plan/tones";
import { formatDateTime, formatShortDate } from "@/lib/release/format";
import { uploadDocumentVisual } from "@/lib/strategy/documents/upload-visual";
import { cn } from "@/lib/utils";

import {
  ActionDateForm,
  ActionForm,
  EntryForm,
  IntentForm,
  LinkForm,
  PhasesForm,
  ReleaseForm,
} from "./plan-forms";

const fr = { collectiveReleases, dialogs, titleReleasePlans };
const t = fr.titleReleasePlans;
const s = t.sections;

const caption =
  "text-[length:var(--type-caption)] leading-[var(--type-caption-lh)] text-[color:var(--text-tertiary)]";
const secondary = "text-[color:var(--text-secondary)]";

const releaseTone = {
  planned: "neutral",
  delivered: "info",
  online: "success",
} as const;

type Ctx = {
  projectId: string;
  plan: TitlePlanDetail;
  editable: boolean;
};

/**
 * A title's Plan de sortie in the app (lot 14), in PO's design system: its
 * seven statuses, then what the document will say — cover and release (read),
 * intention, phases, actions (the title's own and the project's, lot 10),
 * timeline, moodboard and working links — and its versions with their links
 * and journal. The owner edits each part in a dialog; an archived plan, or
 * anyone else, reads only.
 */
export function TitlePlanView({
  projectId,
  organizationId,
  plan,
}: {
  projectId: string;
  organizationId: string | null;
  plan: TitlePlanDetail;
}) {
  const editable = plan.canEdit && plan.status !== "archived";
  const ctx = { projectId, plan, editable };
  return (
    <div className="flex flex-col gap-6">
      <StatusHead plan={plan} projectId={projectId} />
      <ReleaseSection {...ctx} />
      <IntentSection {...ctx} />
      <PhasesSection {...ctx} />
      <ActionsSection {...ctx} />
      <TimelineSection {...ctx} />
      <MoodboardSection {...ctx} organizationId={organizationId} />
      <VersionsSection {...ctx} />
    </div>
  );
}

// --- Status --------------------------------------------------------------------------------

function StatusHead({
  plan,
  projectId,
}: {
  plan: TitlePlanDetail;
  projectId: string;
}) {
  const steps = TITLE_PLAN_STATUSES.filter((x) => x !== "archived").map(
    (x) => t.statuses[x],
  );
  const archived = plan.status === "archived";
  const latest = plan.versions[0];
  const changes =
    plan.changes && hasChanges(plan.changes) ? plan.changes : null;
  return (
    <div className="flex flex-col gap-3">
      {!archived && (
        <>
          {/* Six names fit from 640 px; on a phone, the segments and the
          current status after them. */}
          <PhaseStrip
            big
            className="hidden sm:flex"
            phases={steps}
            current={statusStep(plan.status)}
            label={`${t.page.steps} : ${t.statuses[plan.status]}`}
          />
          <PhaseStrip
            className="sm:hidden"
            phases={steps}
            current={statusStep(plan.status)}
            label={t.statuses[plan.status]}
          />
        </>
      )}
      {archived ? (
        <ToneCallout tone="neutral">
          {t.archivedBecause[plan.archivedReason ?? "closed"]}
        </ToneCallout>
      ) : (
        <p className={cn(caption, "text-[color:var(--text-secondary)]")}>
          {plan.status === "draft" && plan.release.date
            ? t.draftWithDate
            : t.statusHints[plan.status]}
          {plan.status === "draft" && !plan.release.date && (
            <>
              {" "}
              {t.noDateHint}{" "}
              <Link
                href={routes.projectReleases(projectId)}
                className="underline underline-offset-2"
              >
                {t.noDateLink}
              </Link>
            </>
          )}
        </p>
      )}
      {!plan.canEdit && !archived && <p className={caption}>{t.readOnly}</p>}
      {changes && latest && !archived && (
        <ToneCallout
          tone="warning"
          as="div"
          contentClassName="flex flex-col gap-1"
        >
          <p className="font-medium">{t.signal.title(latest.version)}</p>
          {changes.added.length > 0 && (
            <p>{t.signal.added(changes.added.join(", "))}</p>
          )}
          {changes.removed.length > 0 && (
            <p>{t.signal.removed(changes.removed.join(", "))}</p>
          )}
          {changes.changed.length > 0 && (
            <p>{t.signal.changed(changes.changed.join(", "))}</p>
          )}
          <p>{t.signal.body}</p>
        </ToneCallout>
      )}
    </div>
  );
}

// --- Sections ------------------------------------------------------------------------------

function EditButton({
  label,
  text,
  onClick,
}: {
  label: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <Button variant="outline" size="sm" aria-label={label} onClick={onClick}>
      {text}
    </Button>
  );
}

function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  size,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: React.ReactNode;
  size?: "default" | "medium" | "wide";
}) {
  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title={title}
      description={description}
      closeLabel={fr.dialogs.close}
      size={size}
    >
      {open && children}
    </FormDialog>
  );
}

const visualOf = (plan: TitlePlanDetail, key: string | null | undefined) =>
  key ? plan.visuals.find((v) => v.key === key) : undefined;

/** The image picked for a placement or the listening link, small. */
function Thumb({ visual }: { visual: PlanVisual | undefined }) {
  return visual ? (
    // eslint-disable-next-line @next/next/no-img-element -- signed URL
    <img
      src={visual.previewUrl}
      alt=""
      className="size-6 shrink-0 rounded bg-muted object-cover"
    />
  ) : null;
}

function ReleaseSection({ projectId, plan, editable }: Ctx) {
  const r = s.release;
  const [open, setOpen] = useState(false);
  const cover = visualOf(plan, plan.config.cover ?? plan.defaultCover);
  const date = plan.release.date ? formatShortDate(plan.release.date) : null;
  const listening = plan.config.listeningUrl || null;
  return (
    <PageSection
      id="plan-release"
      title={r.title}
      description={r.description}
      card
      action={
        editable ? (
          <EditButton
            label={r.editLabel}
            text={r.edit}
            onClick={() => setOpen(true)}
          />
        ) : undefined
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">{r.cover}</span>
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL
            <img
              src={cover.previewUrl}
              alt={cover.name}
              className="size-28 rounded-xl bg-muted object-cover"
            />
          ) : (
            <p className={cn(caption, "max-w-56")}>{r.noCover}</p>
          )}
        </div>
        <FactList
          className="min-w-0 flex-1"
          emptyLabel={EMPTY_CELL}
          facts={[
            { label: r.mainArtist, value: plan.artist.name || null },
            {
              label: r.guests,
              value: (
                <span className="flex flex-col gap-0.5">
                  <span>
                    {plan.guests.length ? plan.guests.join(", ") : r.noGuest}
                  </span>
                  {plan.pending.length > 0 && (
                    <span className={cn(caption, "font-normal")}>
                      {r.notConfirmed(
                        plan.pending.map((p) => p.name).join(", "),
                      )}
                    </span>
                  )}
                </span>
              ),
            },
            {
              label: r.date,
              value: (
                <span className="flex flex-col gap-0.5">
                  <span className={cn(!date && secondary)}>
                    {date ?? r.noDate}
                  </span>
                  {!plan.release.single && (
                    <span className={cn(caption, "font-normal")}>
                      {r.withCompilation}
                    </span>
                  )}
                </span>
              ),
            },
            {
              label: r.distribution,
              value: plan.release.state ? (
                <StatusBadge tone={releaseTone[plan.release.state]} size="sm">
                  {fr.collectiveReleases.states[plan.release.state]}
                </StatusBadge>
              ) : (
                <span className={secondary}>{r.noRelease}</span>
              ),
            },
            {
              label: r.platforms,
              value: plan.config.platforms?.length ? (
                plan.config.platforms.join(", ")
              ) : (
                <span className={secondary}>{r.noPlatform}</span>
              ),
            },
            {
              label: r.placements,
              value: plan.config.placements?.length ? (
                <span className="flex flex-col gap-1">
                  {plan.config.placements.map((p) => (
                    <span key={p.id} className="flex items-center gap-2">
                      <Thumb visual={visualOf(plan, p.visual)} />
                      <span>{p.label}</span>
                    </span>
                  ))}
                </span>
              ) : (
                <span className={secondary}>{r.noPlacement}</span>
              ),
            },
            {
              label: r.listening,
              value: listening ? (
                <span className="flex items-center gap-2">
                  <Thumb visual={visualOf(plan, plan.config.listeningVisual)} />
                  <a
                    href={listening}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 break-all underline underline-offset-2"
                  >
                    {listening}
                  </a>
                </span>
              ) : (
                <span className={secondary}>{r.noListening}</span>
              ),
            },
          ]}
        />
      </div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t.forms.release.title}
        description={t.forms.release.description}
      >
        <ReleaseForm
          projectId={projectId}
          planId={plan.planId}
          config={plan.config}
          visuals={plan.visuals}
          onDone={() => setOpen(false)}
        />
      </Dialog>
    </PageSection>
  );
}

function IntentSection({ projectId, plan, editable }: Ctx) {
  const i = s.intent;
  const [open, setOpen] = useState(false);
  const fact = (key: "objective" | "audience" | "message") => {
    const own = plan.config[key];
    const fallback = plan.strategy[key];
    if (own) return { label: i[key], value: own };
    if (fallback)
      return {
        label: i[key],
        value: (
          <span className="flex flex-col gap-0.5">
            <span>{fallback}</span>
            <span className={cn(caption, "font-normal")}>{i.fromStrategy}</span>
          </span>
        ),
      };
    return { label: i[key], value: null };
  };
  return (
    <PageSection
      id="plan-intent"
      title={i.title}
      description={i.description}
      card
      action={
        editable ? (
          <EditButton
            label={i.editLabel}
            text={i.edit}
            onClick={() => setOpen(true)}
          />
        ) : undefined
      }
    >
      <FactList
        emptyLabel={i.empty}
        facts={[
          fact("objective"),
          fact("audience"),
          fact("message"),
          {
            label: `${i.priority} · ${i.internal}`,
            value: plan.config.priority
              ? t.priorities[plan.config.priority]
              : null,
          },
        ]}
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t.forms.intent.title}
        description={t.forms.intent.description}
      >
        <IntentForm
          projectId={projectId}
          planId={plan.planId}
          config={plan.config}
          strategy={plan.strategy}
          onDone={() => setOpen(false)}
        />
      </Dialog>
    </PageSection>
  );
}

function PhasesSection({ projectId, plan, editable }: Ctx) {
  const p = s.phases;
  const [open, setOpen] = useState(false);
  const phases = plan.config.phases ?? [];
  return (
    <PageSection
      id="plan-phases"
      title={p.title}
      description={p.description}
      card
      action={
        editable ? (
          <EditButton
            label={p.editLabel}
            text={p.edit}
            onClick={() => setOpen(true)}
          />
        ) : undefined
      }
    >
      {phases.length === 0 ? (
        <p className={caption}>{p.empty}</p>
      ) : (
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {phases.map((phase, index) => (
            <li key={phase.id} className="flex flex-col gap-1">
              <span className="font-medium">{`${index + 1}. ${phase.name}`}</span>
              {phase.text && (
                <span className={cn("text-sm whitespace-pre-line", secondary)}>
                  {phase.text}
                </span>
              )}
            </li>
          ))}
        </ol>
      )}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={t.forms.phases.title}
        description={t.forms.phases.description}
        size="medium"
      >
        <PhasesForm
          projectId={projectId}
          planId={plan.planId}
          config={plan.config}
          onDone={() => setOpen(false)}
        />
      </Dialog>
    </PageSection>
  );
}

function ActionsSection({ projectId, plan, editable }: Ctx) {
  const a = s.actions;
  const dedicated = plan.actions.filter((x) => x.dedicated);
  const global = plan.actions.filter((x) => !x.dedicated);
  return (
    <PageSection
      id="plan-actions"
      title={a.title}
      description={a.description}
      card
    >
      <div className="flex flex-col gap-5">
        <ActionGroup
          title={a.dedicated}
          empty={a.noDedicated}
          actions={dedicated}
          projectId={projectId}
          plan={plan}
          editable={editable}
        />
        <ActionGroup
          title={a.global}
          empty={a.noGlobal}
          actions={global}
          projectId={projectId}
          plan={plan}
          editable={editable}
        />
      </div>
    </PageSection>
  );
}

function ActionGroup({
  title,
  empty,
  actions,
  projectId,
  plan,
  editable,
}: Ctx & { title: string; empty: string; actions: PlanAction[] }) {
  const a = s.actions;
  const [editing, setEditing] = useState<PlanAction | null>(null);
  const name = (id: string | null) =>
    id ? plan.members.find((m) => m.personId === id)?.name : undefined;
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      {actions.length === 0 ? (
        <p className={caption}>{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {actions.map((action) => {
            const choice = plan.config.actions?.[action.key];
            const inDoc = choice?.include !== false;
            const badge = (
              <StatusBadge tone={inDoc ? "info" : "neutral"} size="sm">
                {inDoc ? a.inDocument : a.outOfDocument}
              </StatusBadge>
            );
            return (
              <li
                key={action.key}
                className="flex items-start justify-between gap-3 rounded-xl border border-border px-3 py-2.5 modern:py-3"
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="break-words">{action.title}</span>
                  <span className={caption}>
                    {[
                      a.kinds[action.kind],
                      action.date ? formatShortDate(action.date) : a.noDate,
                      name(action.ownerId),
                      choice?.visuals.length
                        ? t.sections.moodboard.count(choice.visuals.length)
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                  {/* On a phone, the badge under the facts. */}
                  <span className="mt-1 sm:hidden">{badge}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <span className="hidden sm:inline-flex">{badge}</span>
                  {editable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={a.editLabel(action.title)}
                      onClick={() => setEditing(action)}
                    >
                      {a.editShort}
                    </Button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? t.forms.action.title(editing.title) : ""}
        description={t.forms.action.description}
        size="medium"
      >
        {editing && (
          <ActionForm
            projectId={projectId}
            planId={plan.planId}
            config={plan.config}
            action={editing}
            visuals={plan.visuals}
            onDone={() => setEditing(null)}
          />
        )}
      </Dialog>
    </div>
  );
}

type Row =
  | { kind: "action"; key: string; date: string; action: PlanAction }
  | { kind: "entry"; key: string; date: string; entry: TimelineEntry }
  | { kind: "release"; key: string; date: string };

function TimelineSection({ projectId, plan, editable }: Ctx) {
  const tl = s.timeline;
  const [dialog, setDialog] = useState<
    | { kind: "add" }
    | { kind: "entry"; entry: TimelineEntry }
    | { kind: "action"; action: PlanAction }
    | null
  >(null);
  const remove = useWriteSubmit(undefined, tl.removed);
  const release = plan.release.date;
  const rows: Row[] = [
    ...plan.actions.flatMap((action): Row[] =>
      action.date && plan.config.actions?.[action.key]?.include !== false
        ? [{ kind: "action", key: action.key, date: action.date, action }]
        : [],
    ),
    ...(plan.config.timeline ?? []).map((entry): Row => ({
      kind: "entry",
      key: entry.id,
      date: entry.date,
      entry,
    })),
    ...(release
      ? [{ kind: "release" as const, key: "release", date: release }]
      : []),
  ].sort((x, y) => x.date.localeCompare(y.date));
  const name = (id: string | null) =>
    id ? (plan.members.find((m) => m.personId === id)?.name ?? null) : null;
  return (
    <PageSection
      id="plan-timeline"
      title={tl.title}
      description={tl.description}
      card
      action={
        editable ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialog({ kind: "add" })}
          >
            <IconPlus aria-hidden />
            {tl.add}
          </Button>
        ) : undefined
      }
    >
      {rows.length === 0 ? (
        <p className={caption}>{tl.empty}</p>
      ) : (
        <DataTable>
          <DataTableHeader>
            <DataTableHead icon="date" className="w-32">
              {tl.columns.date}
            </DataTableHead>
            <DataTableHead icon="format" fill>
              {tl.columns.format}
            </DataTableHead>
            <DataTableHead icon="kind" hideBelow="lg" className="w-40">
              {tl.columns.channel}
            </DataTableHead>
            <DataTableHead icon="person" hideBelow="lg" className="w-40">
              {tl.columns.owner}
            </DataTableHead>
            <DataTableHead icon="decision" hideBelow="sm" className="w-28">
              {tl.columns.validation}
            </DataTableHead>
            <DataTableActionsHead label={tl.columns.actions} />
          </DataTableHeader>
          <DataTableBody>
            {rows.map((row) => {
              const isRelease = row.kind === "release" || row.date === release;
              const meta =
                row.kind === "action"
                  ? plan.config.actionDates?.[row.key]
                  : row.kind === "entry"
                    ? row.entry
                    : null;
              const format =
                row.kind === "action"
                  ? row.action.title
                  : row.kind === "entry"
                    ? row.entry.format
                    : tl.release(plan.label);
              const owner =
                row.kind === "action"
                  ? name(row.action.ownerId)
                  : row.kind === "entry"
                    ? name(row.entry.owner)
                    : null;
              const channel = meta?.channel ? t.channels[meta.channel] : null;
              const validation =
                row.kind === "release" ? null : meta?.validated ? (
                  <StatusBadge tone="success" size="sm">
                    {tl.validated}
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="warning" size="sm">
                    {tl.toValidate}
                  </StatusBadge>
                );
              const actions: RowAction[] = !editable
                ? []
                : row.kind === "action"
                  ? [
                      {
                        key: "edit",
                        label: tl.edit,
                        icon: IconPenWriting2,
                        onSelect: () =>
                          setDialog({ kind: "action", action: row.action }),
                      },
                    ]
                  : row.kind === "entry"
                    ? [
                        {
                          key: "edit",
                          label: tl.edit,
                          icon: IconPenWriting2,
                          onSelect: () =>
                            setDialog({ kind: "entry", entry: row.entry }),
                        },
                        {
                          key: "remove",
                          label: tl.remove,
                          icon: IconTrash,
                          onSelect: () =>
                            remove.run(() =>
                              saveTitlePlan(projectId, plan.planId, {
                                timeline: (plan.config.timeline ?? []).filter(
                                  (x) => x.id !== row.key,
                                ),
                              }),
                            ),
                        },
                      ]
                    : [];
              return (
                <DataTableRow key={`${row.kind}:${row.key}`}>
                  <DataTableCell className="w-32">
                    <span className="flex items-center gap-1.5 tabular-nums">
                      {isRelease && (
                        <span
                          aria-hidden
                          className="size-2 shrink-0 rounded-full bg-[var(--tone-danger-fg)]"
                        />
                      )}
                      {formatShortDate(row.date)}
                    </span>
                  </DataTableCell>
                  <DataTableCell fill className="whitespace-normal">
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="break-words">{format}</span>
                      <span className={caption}>
                        {[
                          row.kind === "action" ? tl.fromAction : null,
                          isRelease ? tl.releaseDay : null,
                          meta?.account || null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                      <span className={cn(caption, "lg:hidden")}>
                        {[channel, owner].filter(Boolean).join(" · ")}
                      </span>
                      {validation && (
                        <span className="sm:hidden">{validation}</span>
                      )}
                    </span>
                  </DataTableCell>
                  <DataTableCell hideBelow="lg" className="w-40">
                    <span className={cn(!channel && secondary)}>
                      {channel ?? EMPTY_CELL}
                    </span>
                  </DataTableCell>
                  <DataTableCell hideBelow="lg" className="w-40">
                    <span className={cn(!owner && secondary)}>
                      {owner ?? EMPTY_CELL}
                    </span>
                  </DataTableCell>
                  <DataTableCell hideBelow="sm" className="w-28">
                    {validation ?? (
                      <span className={secondary}>{EMPTY_CELL}</span>
                    )}
                  </DataTableCell>
                  <DataTableActionsCell>
                    <RowActions label={tl.rowLabel(format)} actions={actions} />
                  </DataTableActionsCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      )}
      {remove.error && <p className="text-sm text-error">{remove.error}</p>}
      <Dialog
        open={dialog?.kind === "add" || dialog?.kind === "entry"}
        onClose={() => setDialog(null)}
        title={
          dialog?.kind === "entry"
            ? t.forms.entry.editTitle
            : t.forms.entry.addTitle
        }
        description={t.forms.entry.description}
        size="medium"
      >
        {(dialog?.kind === "add" || dialog?.kind === "entry") && (
          <EntryForm
            projectId={projectId}
            planId={plan.planId}
            config={plan.config}
            entry={dialog.kind === "entry" ? dialog.entry : null}
            members={plan.members}
            visuals={plan.visuals}
            onDone={() => setDialog(null)}
          />
        )}
      </Dialog>
      <Dialog
        open={dialog?.kind === "action"}
        onClose={() => setDialog(null)}
        title={
          dialog?.kind === "action"
            ? t.forms.entry.actionTitle(dialog.action.title)
            : ""
        }
        description={t.forms.entry.actionDescription}
        size="medium"
      >
        {dialog?.kind === "action" && (
          <ActionDateForm
            projectId={projectId}
            planId={plan.planId}
            config={plan.config}
            action={dialog.action}
            visuals={plan.visuals}
            onDone={() => setDialog(null)}
          />
        )}
      </Dialog>
    </PageSection>
  );
}

function MoodboardSection({
  projectId,
  plan,
  editable,
  organizationId,
}: Ctx & { organizationId: string | null }) {
  const m = s.moodboard;
  const input = useRef<HTMLInputElement>(null);
  const [uploading, startUpload] = useTransition();
  const [linkOpen, setLinkOpen] = useState(false);
  const write = useWriteSubmit(undefined, m.coverSaved);
  const cover = plan.config.cover ?? plan.defaultCover;
  const groups = ["cover", "artist", "project", "uploads"] as const;
  return (
    <PageSection
      id="plan-moodboard"
      title={m.title}
      description={m.description}
      card
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">{m.images}</h3>
            {editable && organizationId && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => input.current?.click()}
                >
                  <IconImage aria-hidden />
                  {uploading ? m.uploading : m.add}
                </Button>
                <input
                  ref={input}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  tabIndex={-1}
                  aria-hidden
                  onChange={(event) => {
                    const files = [...(event.currentTarget.files ?? [])];
                    event.currentTarget.value = "";
                    if (files.length === 0) return;
                    startUpload(async () => {
                      // One after the other; a file refused says why and
                      // the others still go.
                      const added = [];
                      for (const file of files) {
                        const result = await uploadDocumentVisual({
                          organizationId,
                          projectId,
                          file,
                        });
                        if (!result.ok)
                          toast.error(`${file.name} : ${result.error}`);
                        else added.push(result.visual);
                      }
                      if (added.length === 0) return;
                      const saved = await saveTitlePlan(
                        projectId,
                        plan.planId,
                        {
                          visuals: [
                            ...(plan.config.visuals ?? []),
                            ...added,
                          ].slice(-40),
                        },
                      );
                      if (!saved.ok) return void toast.error(saved.error);
                      toast.success(m.added(added.length));
                    });
                  }}
                />
              </>
            )}
          </div>
          {plan.visuals.length === 0 ? (
            <p className={caption}>{m.noImage}</p>
          ) : (
            groups.map((group) => {
              const list = plan.visuals.filter((v) => v.group === group);
              if (list.length === 0) return null;
              return (
                <div key={group} className="flex flex-col gap-2">
                  <span className={caption}>{m.groups[group]}</span>
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                    {list.map((visual) => (
                      <VisualCard
                        key={visual.key}
                        visual={visual}
                        isCover={visual.key === cover}
                        actions={
                          editable && visual.key !== cover
                            ? [
                                {
                                  key: "cover",
                                  label: m.useAsCover,
                                  icon: IconImage,
                                  onSelect: () =>
                                    write.run(() =>
                                      saveTitlePlan(projectId, plan.planId, {
                                        cover: visual.key,
                                      }),
                                    ),
                                },
                              ]
                            : []
                        }
                      />
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium">{m.links}</h3>
            {editable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLinkOpen(true)}
              >
                <IconPlus aria-hidden />
                {m.addLink}
              </Button>
            )}
          </div>
          {(plan.config.links ?? []).length === 0 ? (
            <p className={caption}>{m.noLink}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {(plan.config.links ?? []).map((link) => (
                <li key={link.id} className="flex items-center gap-2">
                  <IconLink
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 truncate underline underline-offset-2"
                  >
                    {link.label}
                  </a>
                  {editable && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={m.removeLink(link.label)}
                      onClick={() =>
                        write.run(
                          () =>
                            saveTitlePlan(projectId, plan.planId, {
                              links: (plan.config.links ?? []).filter(
                                (x) => x.id !== link.id,
                              ),
                            }),
                          m.linkRemoved,
                        )
                      }
                    >
                      <IconXmark aria-hidden />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <Dialog
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title={t.forms.link.title}
        description={t.forms.link.description}
      >
        <LinkForm
          projectId={projectId}
          planId={plan.planId}
          config={plan.config}
          onDone={() => setLinkOpen(false)}
        />
      </Dialog>
    </PageSection>
  );
}

function VisualCard({
  visual,
  isCover,
  actions,
}: {
  visual: PlanVisual;
  isCover: boolean;
  actions: RowAction[];
}) {
  return (
    <li className="relative flex flex-col gap-1.5 rounded-2xl border border-border bg-card p-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed URL or public bucket */}
      <img
        src={visual.previewUrl}
        alt=""
        loading="lazy"
        className="aspect-square w-full rounded-xl bg-muted object-cover"
      />
      <span className="flex min-w-0 items-center justify-between gap-1">
        <span className="truncate text-[length:var(--type-caption)]">
          {visual.name}
        </span>
        <RowActions
          label={s.moodboard.imageActions(visual.name)}
          actions={actions}
        />
      </span>
      {isCover && (
        <span className="absolute top-3 left-3">
          <StatusBadge tone="info" size="sm">
            {s.moodboard.isCover}
          </StatusBadge>
        </span>
      )}
    </li>
  );
}

function VersionsSection({ projectId, plan }: Ctx) {
  const v = s.versions;
  const write = useWriteSubmit(undefined, v.revoked);
  const [sharing, startShare] = useTransition();
  const latest = plan.versions[0];
  const shareable = plan.canEdit && SHAREABLE_STATUSES.includes(plan.status);
  return (
    <PageSection
      id="plan-versions"
      title={v.title}
      description={v.description}
      card
    >
      <div className="flex flex-col gap-5">
        {plan.versions.length === 0 ? (
          <p className={caption}>{v.empty}</p>
        ) : (
          <DataTable>
            <DataTableHeader>
              <DataTableHead icon="format" fill>
                {v.columns.version}
              </DataTableHead>
              <DataTableHead icon="status" hideBelow="sm" className="w-40">
                {v.columns.status}
              </DataTableHead>
              <DataTableHead icon="person" hideBelow="lg" className="w-40">
                {v.columns.by}
              </DataTableHead>
              <DataTableHead icon="date" hideBelow="lg" className="w-44">
                {v.columns.at}
              </DataTableHead>
              <DataTableActionsHead label={v.columns.actions} />
            </DataTableHeader>
            <DataTableBody>
              {plan.versions.map((version) => {
                const href = routes.titlePlanVersion(projectId, version.id);
                const canShare =
                  shareable && (version.linkLive || version.id === latest?.id);
                const actions: RowAction[] = [
                  {
                    key: "view",
                    label: v.view,
                    icon: IconEyeOpen,
                    onSelect: () => window.open(href, "_blank", "noopener"),
                  },
                  {
                    key: "pdf",
                    label: v.pdf,
                    icon: IconDownload,
                    onSelect: () => {
                      // A download (attachment): the page stays.
                      const link = document.createElement("a");
                      link.href = `${href}?format=pdf`;
                      link.click();
                    },
                  },
                  ...(canShare
                    ? [
                        {
                          key: "share",
                          label: v.share,
                          icon: IconCopy,
                          onSelect: () =>
                            startShare(async () => {
                              const result = await shareTitlePlanVersion(
                                projectId,
                                version.id,
                              );
                              if (!result.ok)
                                return void toast.error(result.error);
                              try {
                                await navigator.clipboard.writeText(result.url);
                                toast.success(v.shared);
                              } catch {
                                toast.message(result.url);
                              }
                            }),
                        },
                      ]
                    : []),
                  ...(plan.canEdit && version.linkLive
                    ? [
                        {
                          key: "revoke",
                          label: v.revoke,
                          icon: IconXmark,
                          onSelect: () =>
                            write.run(() =>
                              revokeTitlePlanLink(projectId, version.id),
                            ),
                        },
                      ]
                    : []),
                ];
                const status = (
                  <StatusBadge tone={planStatusTone[version.status]} size="sm">
                    {t.statuses[version.status]}
                  </StatusBadge>
                );
                return (
                  <DataTableRow key={version.id}>
                    <DataTableCell fill className="whitespace-normal">
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium tabular-nums">
                            {t.list.version(version.version)}
                          </span>
                          <span className="sm:hidden">{status}</span>
                          {version.linkLive && (
                            <StatusBadge tone="success" size="sm">
                              {v.linkLive}
                            </StatusBadge>
                          )}
                        </span>
                        {version.note && (
                          <span
                            className={cn("text-sm break-words", secondary)}
                          >
                            {version.note}
                          </span>
                        )}
                        <span className={cn(caption, "lg:hidden")}>
                          {[version.by, formatDateTime(version.at)]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </DataTableCell>
                    <DataTableCell hideBelow="sm" className="w-40">
                      {status}
                    </DataTableCell>
                    <DataTableCell hideBelow="lg" className="w-40">
                      <span className={cn(!version.by && secondary)}>
                        {version.by ?? EMPTY_CELL}
                      </span>
                    </DataTableCell>
                    <DataTableCell hideBelow="lg" className="w-44">
                      {formatDateTime(version.at)}
                    </DataTableCell>
                    <DataTableActionsCell>
                      <RowActions
                        label={v.rowLabel(version.version)}
                        actions={
                          sharing
                            ? actions.filter((a) => a.key !== "share")
                            : actions
                        }
                      />
                    </DataTableActionsCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        )}
        {write.error && <p className="text-sm text-error">{write.error}</p>}
      </div>
    </PageSection>
  );
}
