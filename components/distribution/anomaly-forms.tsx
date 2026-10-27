"use client";

import { useState, type FormEvent } from "react";

import { FormMessage } from "@/components/auth/form-message";
import { NoteForm } from "@/components/distribution/note-form";
import { TextareaField } from "@/components/auth/textarea-field";
import { OptionSelect } from "@/components/projects/option-select";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  ANOMALY_KINDS,
  ANOMALY_MODULES,
  ANOMALY_STATES,
  DEFAULT_MODULE,
  SEVERITIES,
  type AnomalyKind,
  type AnomalyModule,
  type AnomalyState,
  type Severity,
} from "@/lib/distribution/anomalies";
import {
  prepareDistributionVersion,
  reportDistributionAnomaly,
  setDistributionAnomalyState,
} from "@/lib/distribution/anomalies-actions";
import { distribution } from "@/lib/i18n/fr/distribution";

const fr = { distribution };

const t = fr.distribution.anomalies;

const items = <K extends string>(
  keys: readonly K[],
  labels: Record<K, string>,
) => Object.fromEntries(keys.map((key) => [key, labels[key]]));

/** « Signaler une anomalie », with the module owning the correction. */
export function ReportAnomalyButton({
  projectId,
  platforms,
}: {
  projectId: string;
  platforms: Array<{ key: string; name: string }>;
}) {
  return (
    <DialogButton
      label={t.report}
      title={t.form.title}
      description={t.form.description}
    >
      {(close) => (
        <ReportForm
          projectId={projectId}
          platforms={platforms}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function ReportForm({
  projectId,
  platforms,
  onDone,
}: {
  projectId: string;
  platforms: Array<{ key: string; name: string }>;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<AnomalyKind>("metadata");
  const [module, setModule] = useState<AnomalyModule>(DEFAULT_MODULE.metadata);
  const [severity, setSeverity] = useState<Severity>("major");
  const [descriptionError, setDescriptionError] = useState<string>();
  const { pending, error, run } = useWriteSubmit(onDone, t.form.saved);

  function submit(event: FormEvent<HTMLFormElement>) {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const description = String(data.get("description") ?? "");
    if (!description.trim()) {
      setDescriptionError(t.form.noteRequired);
      return;
    }
    setDescriptionError(undefined);
    run(() =>
      reportDistributionAnomaly({
        projectId,
        kind,
        description,
        platform: String(data.get("platform") ?? ""),
        severity,
        module,
      }),
    );
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
      <OptionSelect
        name="kind"
        label={t.form.kind}
        items={items(ANOMALY_KINDS, t.kinds)}
        defaultValue={kind}
        onValueChange={(value) => {
          const next = value as AnomalyKind;
          setKind(next);
          setModule(DEFAULT_MODULE[next]);
        }}
        required
      />
      <TextareaField
        name="description"
        label={t.form.description_}
        rows={3}
        maxLength={2000}
        required
        error={descriptionError}
      />
      {platforms.length > 0 && (
        <OptionSelect
          name="platform"
          label={t.form.platform}
          placeholder={t.form.platformNone}
          items={Object.fromEntries(platforms.map((p) => [p.key, p.name]))}
          defaultValue={null}
        />
      )}
      <ChoiceCards
        name="severity"
        legend={t.form.severity}
        columns={3}
        value={severity}
        onChange={setSeverity}
        choices={SEVERITIES.map((value) => ({
          value,
          label: t.severities[value],
        }))}
      />
      <OptionSelect
        name="module"
        label={t.form.module}
        items={items(ANOMALY_MODULES, t.modules)}
        defaultValue={module}
        onValueChange={(value) => setModule(value as AnomalyModule)}
        required
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.form.submit}
        onCancel={onDone}
      />
    </form>
  );
}

/** « Changer l'état » of an anomaly; resolved or dismissed says why. */
export function AnomalyStateButton({
  projectId,
  anomalyId,
  state,
}: {
  projectId: string;
  anomalyId: string;
  state: AnomalyState;
}) {
  return (
    <DialogButton
      label={t.change}
      variant="ghost"
      title={t.form.stateTitle}
      description={t.form.stateDescription}
    >
      {(close) => (
        <StateForm
          projectId={projectId}
          anomalyId={anomalyId}
          state={state}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function StateForm({
  projectId,
  anomalyId,
  state,
  onDone,
}: {
  projectId: string;
  anomalyId: string;
  state: AnomalyState;
  onDone: () => void;
}) {
  const [next, setNext] = useState<AnomalyState>(
    state === "open" ? "in_correction" : state,
  );
  const [noteError, setNoteError] = useState<string>();
  const { pending, error, run } = useWriteSubmit(onDone, t.form.stateSaved);
  const closing = next === "resolved" || next === "dismissed";

  function submit(event: FormEvent<HTMLFormElement>) {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const note = String(new FormData(event.currentTarget).get("note") ?? "");
    if (closing && !note.trim()) {
      setNoteError(t.form.noteRequired);
      return;
    }
    setNoteError(undefined);
    run(() =>
      setDistributionAnomalyState({ projectId, anomalyId, state: next, note }),
    );
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
      <ChoiceCards
        name="state"
        legend={t.form.state}
        value={next}
        onChange={setNext}
        choices={ANOMALY_STATES.map((value) => ({
          value,
          label: t.states[value],
        }))}
      />
      <TextareaField
        name="note"
        label={t.form.note}
        rows={2}
        maxLength={1000}
        required={closing}
        error={noteError}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.form.stateSubmit}
        onCancel={onDone}
      />
    </form>
  );
}

/** « Préparer la Vn » once a source was corrected (CA13). */
export function PrepareVersionButton({
  projectId,
  current,
}: {
  projectId: string;
  current: number;
}) {
  return (
    <DialogButton
      label={t.newVersion(current + 1)}
      title={t.newVersionTitle(current + 1)}
      description={t.newVersionBody(current)}
    >
      {(close) => (
        <NoteForm
          label={t.newVersionNote}
          submitLabel={t.newVersionSubmit}
          done={t.newVersionDone}
          onDone={close}
          send={(note) => prepareDistributionVersion({ projectId, note })}
        />
      )}
    </DialogButton>
  );
}
