"use client";

import { IconPlus, IconXmark } from "nucleo-sharp-essential";
import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { VisualTile } from "@/components/strategy/release-plan/visual-tile";
import { Button } from "@/components/ui/button";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import { titleReleasePlans } from "@/lib/i18n/fr/title-release-plans";
import { saveTitlePlan } from "@/lib/projects/title-plan/actions";
import type { PlanAction } from "@/lib/projects/title-plan/build";
import {
  draftId,
  MAX_PLACEMENTS,
  TITLE_PLAN_CHANNELS,
  TITLE_PLAN_PRIORITIES,
  type ActionDate,
  type TimelineEntry,
  type TitlePlanConfig,
  type TitlePlanPhase,
  type TitlePlanPlacement,
} from "@/lib/projects/title-plan/model";
import type {
  PlanVisual,
  TitlePlanDetail,
} from "@/lib/projects/title-plan/queries";

const fr = { titleReleasePlans };
const t = fr.titleReleasePlans;
const f = t.forms;

const HTTPS = /^https:\/\/[^\s"'<>]+$/i;
const NONE = "none";

export type FormBase = {
  projectId: string;
  planId: string;
  config: TitlePlanConfig;
  onDone: () => void;
};

const value = (form: HTMLFormElement, name: string) =>
  String(new FormData(form).get(name) ?? "").trim();

function useSave(onDone: () => void, done = f.saved) {
  return useWriteSubmit(onDone, done);
}

/** One image picked among the plan's, folded until the owner opens it. */
function ImageChoice({
  id,
  label,
  visuals,
  value: current,
  onChange,
}: {
  id: string;
  label: string;
  visuals: PlanVisual[];
  value: string | null;
  onChange: (key: string | null) => void;
}) {
  const r = f.release;
  const [open, setOpen] = useState(false);
  const chosen = current ? visuals.find((v) => v.key === current) : undefined;
  return (
    <div className="flex flex-col gap-2" role="group" aria-labelledby={id}>
      <div className="flex flex-wrap items-center gap-2">
        <span id={id} className="text-sm text-muted-foreground">
          {label}
        </span>
        {chosen && (
          <span className="flex min-w-0 items-center gap-2 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed URL */}
            <img
              src={chosen.previewUrl}
              alt=""
              className="size-8 rounded-md bg-muted object-cover"
            />
            <span className="truncate">{chosen.name}</span>
          </span>
        )}
        <span className="ms-auto flex gap-1">
          {visuals.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-expanded={open}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? r.closeImages : chosen ? r.changeImage : r.chooseImage}
            </Button>
          )}
          {chosen && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              {r.removeImage}
            </Button>
          )}
        </span>
      </div>
      {visuals.length === 0 && (
        <p className="text-[length:var(--type-caption)] text-[color:var(--text-tertiary)]">
          {f.action.noVisual}
        </p>
      )}
      {open && (
        <VisualPicker
          visuals={visuals}
          selected={current ? [current] : []}
          max={1}
          onChange={(keys) => {
            onChange(keys[0] ?? null);
            if (keys[0]) setOpen(false);
          }}
        />
      )}
    </div>
  );
}

/** « Plateformes, placements et lien d'écoute »: the release page. */
export function ReleaseForm({
  projectId,
  planId,
  config,
  visuals,
  onDone,
}: FormBase & { visuals: PlanVisual[] }) {
  const r = f.release;
  const [errors, setErrors] = useState<{ platforms?: string; url?: string }>(
    {},
  );
  const [placements, setPlacements] = useState<TitlePlanPlacement[]>(
    config.placements ?? [],
  );
  const [missing, setMissing] = useState<string[]>([]);
  const [listeningVisual, setListeningVisual] = useState<string | null>(
    config.listeningVisual ?? null,
  );
  const { pending, error, run } = useSave(onDone);
  const update = (id: string, patch: Partial<TitlePlanPlacement>) =>
    setPlacements((list) =>
      list.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    );
  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const platforms = value(event.currentTarget, "platforms")
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean);
        const url = value(event.currentTarget, "listening");
        const next = {
          platforms:
            platforms.length > 8 || platforms.some((p) => p.length > 80)
              ? r.tooMany
              : undefined,
          url: url && !HTTPS.test(url) ? r.badUrl : undefined,
        };
        const empty = placements
          .filter((x) => !x.label.trim())
          .map((x) => x.id);
        setErrors(next);
        setMissing(empty);
        if (next.platforms || next.url || empty.length) return;
        run(() =>
          saveTitlePlan(projectId, planId, {
            platforms,
            placements: placements.map((x) => ({
              ...x,
              label: x.label.trim(),
            })),
            listeningUrl: url,
            listeningVisual: url ? listeningVisual : null,
          }),
        );
      }}
    >
      <TextareaField
        id="plan-platforms"
        name="platforms"
        label={r.platforms}
        hint={r.platformsHint}
        rows={3}
        defaultValue={(config.platforms ?? []).join("\n")}
        error={errors.platforms}
      />
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{r.placements}</span>
          <span className="text-[length:var(--type-caption)] text-[color:var(--text-tertiary)]">
            {r.placementsHint}
          </span>
        </div>
        {placements.map((placement, i) => (
          <fieldset
            key={placement.id}
            className="flex flex-col gap-2 rounded-xl bg-muted/50 p-3"
          >
            <legend className="sr-only">{r.placement(i + 1)}</legend>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <Field
                  id={`plan-placement-${placement.id}`}
                  name={`placement-${placement.id}`}
                  label={r.placementLabel(i + 1)}
                  hideLabel
                  maxLength={80}
                  placeholder={i === 0 ? r.placementPlaceholder : undefined}
                  value={placement.label}
                  error={
                    missing.includes(placement.id)
                      ? r.placementRequired
                      : undefined
                  }
                  onChange={(event) => {
                    update(placement.id, { label: event.currentTarget.value });
                    setMissing((m) => m.filter((x) => x !== placement.id));
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="mt-1.5"
                aria-label={r.removePlacement(i + 1)}
                onClick={() =>
                  setPlacements((list) =>
                    list.filter((x) => x.id !== placement.id),
                  )
                }
              >
                <IconXmark aria-hidden />
              </Button>
            </div>
            <ImageChoice
              id={`plan-placement-image-${placement.id}`}
              label={r.placementImage}
              visuals={visuals}
              value={placement.visual}
              onChange={(key) => update(placement.id, { visual: key })}
            />
          </fieldset>
        ))}
        {placements.length < MAX_PLACEMENTS && (
          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={() =>
              setPlacements((list) => [
                ...list,
                { id: draftId(), label: "", visual: null },
              ])
            }
          >
            <IconPlus aria-hidden />
            {r.addPlacement}
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <Field
          id="plan-listening"
          name="listening"
          type="url"
          inputMode="url"
          label={r.listening}
          hint={r.listeningHint}
          defaultValue={config.listeningUrl ?? ""}
          error={errors.url}
          onChange={() => setErrors((e) => ({ ...e, url: undefined }))}
        />
        <ImageChoice
          id="plan-listening-image"
          label={r.listeningImage}
          visuals={visuals}
          value={listeningVisual}
          onChange={setListeningVisual}
        />
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={r.submit}
        onCancel={onDone}
      />
    </form>
  );
}

/** « Intention »: what the Stratégie validated, until the plan says else. */
export function IntentForm({
  projectId,
  planId,
  config,
  strategy,
  onDone,
}: FormBase & { strategy: TitlePlanDetail["strategy"] }) {
  const s = t.sections.intent;
  const { pending, error, run } = useSave(onDone);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const priority = value(form, "priority");
        run(() =>
          saveTitlePlan(projectId, planId, {
            objective: value(form, "objective"),
            audience: value(form, "audience"),
            message: value(form, "message"),
            priority: (TITLE_PLAN_PRIORITIES as readonly string[]).includes(
              priority,
            )
              ? (priority as (typeof TITLE_PLAN_PRIORITIES)[number])
              : null,
          }),
        );
      }}
    >
      {(["objective", "audience", "message"] as const).map((key) => (
        <TextareaField
          key={key}
          id={`plan-${key}`}
          name={key}
          label={s[key]}
          rows={3}
          maxLength={1000}
          defaultValue={config[key] || strategy[key] || ""}
          hint={!config[key] && strategy[key] ? s.fromStrategy : undefined}
        />
      ))}
      <OptionSelect
        id="plan-priority"
        name="priority"
        label={`${s.priority} · ${s.internal}`}
        items={{ [NONE]: s.empty, ...t.priorities }}
        defaultValue={config.priority ?? NONE}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={f.intent.submit}
        onCancel={onDone}
      />
    </form>
  );
}

/** « Phases de campagne »: up to six, in order. */
export function PhasesForm({ projectId, planId, config, onDone }: FormBase) {
  const p = f.phases;
  const [phases, setPhases] = useState<TitlePlanPhase[]>(
    config.phases?.length ? config.phases : [],
  );
  const [missing, setMissing] = useState<string[]>([]);
  const { pending, error, run } = useSave(onDone);
  const update = (id: string, patch: Partial<TitlePlanPhase>) =>
    setPhases((list) =>
      list.map((x) => (x.id === id ? { ...x, ...patch } : x)),
    );
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const empty = phases.filter((x) => !x.name.trim()).map((x) => x.id);
        setMissing(empty);
        if (empty.length) return;
        run(() =>
          saveTitlePlan(projectId, planId, {
            phases: phases.map((x) => ({
              ...x,
              name: x.name.trim(),
              text: x.text.trim(),
            })),
          }),
        );
      }}
    >
      {phases.map((phase, i) => (
        <fieldset key={phase.id} className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <legend className="text-sm font-medium">{p.name(i + 1)}</legend>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={p.remove(i + 1)}
              onClick={() =>
                setPhases((list) => list.filter((x) => x.id !== phase.id))
              }
            >
              <IconXmark aria-hidden />
            </Button>
          </div>
          <Field
            id={`plan-phase-${phase.id}`}
            name={`phase-${phase.id}`}
            label={p.nameLabel(i + 1)}
            hideLabel
            maxLength={60}
            placeholder={i === 0 ? p.namePlaceholder : undefined}
            value={phase.name}
            error={missing.includes(phase.id) ? p.nameRequired : undefined}
            onChange={(event) => {
              update(phase.id, { name: event.currentTarget.value });
              setMissing((m) => m.filter((x) => x !== phase.id));
            }}
          />
          <TextareaField
            id={`plan-phase-text-${phase.id}`}
            name={`phase-text-${phase.id}`}
            label={p.text(i + 1)}
            hideLabel
            rows={3}
            maxLength={600}
            value={phase.text}
            onChange={(event) =>
              update(phase.id, { text: event.currentTarget.value })
            }
          />
        </fieldset>
      ))}
      {phases.length < 6 && (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() =>
            setPhases((list) => [
              ...list,
              { id: draftId(), name: "", text: "" },
            ])
          }
        >
          <IconPlus aria-hidden />
          {p.add}
        </Button>
      )}
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={p.submit}
        onCancel={onDone}
      />
    </form>
  );
}

/** Images picked among the plan's (cover, pages, timeline). */
function VisualPicker({
  visuals,
  selected,
  max,
  onChange,
}: {
  visuals: PlanVisual[];
  selected: string[];
  max: number;
  onChange: (keys: string[]) => void;
}) {
  if (visuals.length === 0)
    return (
      <p className="text-[length:var(--type-caption)] text-[color:var(--text-tertiary)]">
        {f.action.noVisual}
      </p>
    );
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {visuals.map((v) => {
        const on = selected.includes(v.key);
        return (
          <VisualTile
            key={v.key}
            name={v.name}
            url={v.previewUrl}
            selected={on}
            disabled={!on && selected.length >= max}
            onToggle={() =>
              onChange(
                on
                  ? selected.filter((k) => k !== v.key)
                  : max === 1
                    ? [v.key]
                    : [...selected, v.key],
              )
            }
          />
        );
      })}
    </div>
  );
}

/** An action in the document: in or out, its text, its images. */
export function ActionForm({
  projectId,
  planId,
  config,
  action,
  visuals,
  onDone,
}: FormBase & { action: PlanAction; visuals: PlanVisual[] }) {
  const a = f.action;
  const current = config.actions?.[action.key];
  const [include, setInclude] = useState(current?.include ?? true);
  const [picked, setPicked] = useState<string[]>(current?.visuals ?? []);
  const { pending, error, run } = useSave(onDone);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const text = value(event.currentTarget, "text");
        run(() =>
          saveTitlePlan(projectId, planId, {
            actions: {
              ...(config.actions ?? {}),
              [action.key]: { include, text, visuals: picked.slice(0, 5) },
            },
          }),
        );
      }}
    >
      <CheckboxField
        name="include"
        label={a.include}
        checked={include}
        onChange={setInclude}
      />
      <TextareaField
        id={`plan-action-text-${action.key}`}
        name="text"
        label={a.text}
        rows={4}
        maxLength={800}
        defaultValue={current?.text ?? ""}
      />
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{a.visuals}</span>
        <VisualPicker
          visuals={visuals}
          selected={picked}
          max={5}
          onChange={setPicked}
        />
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={a.submit}
        onCancel={onDone}
      />
    </form>
  );
}

const channelItems = () => ({
  [NONE]: f.entry.noChannel,
  ...Object.fromEntries(TITLE_PLAN_CHANNELS.map((c) => [c, t.channels[c]])),
});
const channelOf = (raw: string) =>
  (TITLE_PLAN_CHANNELS as readonly string[]).includes(raw)
    ? (raw as (typeof TITLE_PLAN_CHANNELS)[number])
    : null;

/** A date of the timeline added in the plan (added or changed). */
export function EntryForm({
  projectId,
  planId,
  config,
  entry,
  members,
  visuals,
  onDone,
}: FormBase & {
  entry: TimelineEntry | null;
  members: TitlePlanDetail["members"];
  visuals: PlanVisual[];
}) {
  const e = f.entry;
  const [errors, setErrors] = useState<{ date?: string; format?: string }>({});
  const [visual, setVisual] = useState<string[]>(
    entry?.visual ? [entry.visual] : [],
  );
  const [validated, setValidated] = useState(entry?.validated ?? false);
  const { pending, error, run } = useSave(onDone);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const date = value(form, "date");
        const format = value(form, "format");
        const next = {
          date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? undefined : e.dateRequired,
          format: format ? undefined : e.formatRequired,
        };
        setErrors(next);
        if (next.date || next.format) return;
        const owner = value(form, "owner");
        const saved: TimelineEntry = {
          id: entry?.id ?? draftId(),
          date,
          format,
          channel: channelOf(value(form, "channel")),
          account: value(form, "account"),
          owner: members.some((m) => m.personId === owner) ? owner : null,
          validated,
          visual: visual[0] ?? null,
        };
        const list = config.timeline ?? [];
        run(() =>
          saveTitlePlan(projectId, planId, {
            timeline: entry
              ? list.map((x) => (x.id === entry.id ? saved : x))
              : [...list, saved],
          }),
        );
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="plan-entry-date"
          name="date"
          type="date"
          label={e.date}
          required
          defaultValue={entry?.date ?? ""}
          error={errors.date}
        />
        <Field
          id="plan-entry-format"
          name="format"
          label={e.format}
          required
          maxLength={120}
          placeholder={e.formatPlaceholder}
          defaultValue={entry?.format ?? ""}
          error={errors.format}
        />
        <OptionSelect
          id="plan-entry-channel"
          name="channel"
          label={e.channel}
          items={channelItems()}
          defaultValue={entry?.channel ?? NONE}
        />
        <Field
          id="plan-entry-account"
          name="account"
          label={e.account}
          maxLength={60}
          placeholder={e.accountPlaceholder}
          defaultValue={entry?.account ?? ""}
        />
        <OptionSelect
          id="plan-entry-owner"
          name="owner"
          label={e.owner}
          items={{
            [NONE]: e.noOwner,
            ...Object.fromEntries(members.map((m) => [m.personId, m.name])),
          }}
          defaultValue={entry?.owner ?? NONE}
        />
      </div>
      <CheckboxField
        name="validated"
        label={e.validated}
        checked={validated}
        onChange={setValidated}
      />
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{e.visual}</span>
        <VisualPicker
          visuals={visuals}
          selected={visual}
          max={1}
          onChange={setVisual}
        />
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={e.submit}
        onCancel={onDone}
      />
    </form>
  );
}

/** The date of an action: its channel, account, image, validation. */
export function ActionDateForm({
  projectId,
  planId,
  config,
  action,
  visuals,
  onDone,
}: FormBase & { action: PlanAction; visuals: PlanVisual[] }) {
  const e = f.entry;
  const current = config.actionDates?.[action.key];
  const [visual, setVisual] = useState<string[]>(
    current?.visual ? [current.visual] : [],
  );
  const [validated, setValidated] = useState(current?.validated ?? false);
  const { pending, error, run } = useSave(onDone);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const saved: ActionDate = {
          channel: channelOf(value(form, "channel")),
          account: value(form, "account"),
          validated,
          visual: visual[0] ?? null,
        };
        run(() =>
          saveTitlePlan(projectId, planId, {
            actionDates: { ...(config.actionDates ?? {}), [action.key]: saved },
          }),
        );
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <OptionSelect
          id="plan-action-channel"
          name="channel"
          label={e.channel}
          items={channelItems()}
          defaultValue={current?.channel ?? NONE}
        />
        <Field
          id="plan-action-account"
          name="account"
          label={e.account}
          maxLength={60}
          placeholder={e.accountPlaceholder}
          defaultValue={current?.account ?? ""}
        />
      </div>
      <CheckboxField
        name="validated"
        label={e.validated}
        checked={validated}
        onChange={setValidated}
      />
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{e.visual}</span>
        <VisualPicker
          visuals={visuals}
          selected={visual}
          max={1}
          onChange={setVisual}
        />
      </div>
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={e.submit}
        onCancel={onDone}
      />
    </form>
  );
}

/** « Ajouter un lien » (internal: Drive, assets). */
export function LinkForm({ projectId, planId, config, onDone }: FormBase) {
  const l = f.link;
  const [errors, setErrors] = useState<{ label?: string; url?: string }>({});
  const { pending, error, run } = useSave(onDone);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const label = value(form, "label");
        const url = value(form, "url");
        const next = {
          label: label ? undefined : l.labelRequired,
          url: HTTPS.test(url) ? undefined : l.badUrl,
        };
        setErrors(next);
        if (next.label || next.url) return;
        run(() =>
          saveTitlePlan(projectId, planId, {
            links: [...(config.links ?? []), { id: draftId(), label, url }],
          }),
        );
      }}
    >
      <Field
        id="plan-link-label"
        name="label"
        label={l.label}
        required
        maxLength={80}
        placeholder={l.labelPlaceholder}
        error={errors.label}
      />
      <Field
        id="plan-link-url"
        name="url"
        type="url"
        inputMode="url"
        label={l.url}
        required
        error={errors.url}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={l.submit}
        onCancel={onDone}
      />
    </form>
  );
}
