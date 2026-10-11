"use client";

import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { OptionSelect } from "@/components/projects/option-select";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { Label } from "@/components/ui/label";
import { useDialogSubmit } from "@/components/ui/use-dialog-submit";
import { fr } from "@/lib/i18n/fr";
import { saveEvidence } from "@/lib/marketing/actions/activations";
import {
  AVAILABILITIES,
  type Availability,
  type Evidence,
  type EvidenceKind,
} from "@/lib/marketing/model";

const t = fr.marketing.evidence;

/**
 * Declares a publication or a coverage, or notes a statistic, with where it
 * comes from (who declared it, when it was seen). A statistic says whether
 * the figure exists: an unavailable one has no value, never a zero.
 */
export function EvidenceForm({
  projectId,
  activationId,
  kind,
  evidence,
  onDone,
}: {
  projectId: string;
  activationId: string;
  kind: EvidenceKind;
  evidence: Evidence | null;
  onDone: () => void;
}) {
  const ev = evidence;
  const { pending, error, run } = useDialogSubmit(
    onDone,
    ev ? t.updated : t.saved,
  );
  const [availability, setAvailability] = useState<Availability>(
    ev?.availability ?? "available",
  );
  const statistic = kind === "statistic";
  const id = (field: string) => `evidence-${ev?.id ?? kind}-${field}`;

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = (key: string) => String(data.get(key) ?? "");
        run(() =>
          saveEvidence({
            projectId,
            activationId,
            id: ev?.id ?? "",
            kind,
            label: text("label"),
            url: text("url"),
            platform: text("platform"),
            metric: text("metric"),
            value: availability === "unavailable" ? "" : text("value"),
            periodStart: text("periodStart"),
            periodEnd: text("periodEnd"),
            availability: statistic ? availability : "",
            reportedBy: text("reportedBy"),
            observedOn: text("observedOn"),
            toVerify: data.get("toVerify") === "on",
          }),
        );
      }}
    >
      <Field
        id={id("label")}
        name="label"
        label={t.fields.label}
        placeholder={t.fields.labelPlaceholder[kind]}
        required
        maxLength={200}
        defaultValue={ev?.label ?? ""}
      />
      {statistic && (
        <>
          <Field
            id={id("metric")}
            name="metric"
            label={t.fields.metric}
            placeholder={t.fields.metricPlaceholder}
            required
            maxLength={80}
            defaultValue={ev?.metric ?? ""}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <OptionSelect
              id={id("availability")}
              name="availability"
              label={t.fields.availability}
              required
              items={Object.fromEntries(
                AVAILABILITIES.map((a) => [a, t.availabilities[a]]),
              )}
              defaultValue={availability}
              onValueChange={(next) => {
                const found = AVAILABILITIES.find((a) => a === next);
                if (found) setAvailability(found);
              }}
            />
            {availability !== "unavailable" && (
              <Field
                id={id("value")}
                name="value"
                label={t.fields.value}
                inputMode="decimal"
                required
                className="tabular-nums"
                defaultValue={ev?.value === null || !ev ? "" : String(ev.value)}
              />
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              id={id("periodStart")}
              name="periodStart"
              type="date"
              label={t.fields.periodStart}
              defaultValue={ev?.periodStart ?? ""}
            />
            <Field
              id={id("periodEnd")}
              name="periodEnd"
              type="date"
              label={t.fields.periodEnd}
              defaultValue={ev?.periodEnd ?? ""}
            />
          </div>
        </>
      )}
      <Field
        id={id("url")}
        name="url"
        type="url"
        label={t.fields.url}
        hint={t.fields.urlHint}
        maxLength={2048}
        pattern="https://.+"
        defaultValue={ev?.url ?? ""}
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={id("platform")}
          name="platform"
          label={t.fields.platform}
          maxLength={80}
          defaultValue={ev?.platform ?? ""}
        />
        <Field
          id={id("reportedBy")}
          name="reportedBy"
          label={t.fields.reportedBy}
          placeholder={t.fields.reportedByPlaceholder}
          maxLength={200}
          defaultValue={ev?.reportedBy ?? ""}
        />
      </div>
      <Field
        id={id("observedOn")}
        name="observedOn"
        type="date"
        label={t.fields.observedOn}
        className="w-fit"
        defaultValue={ev?.observedOn ?? ""}
      />
      {!ev && (
        <div className="flex items-center gap-2">
          <Checkbox id={id("toVerify")} name="toVerify" />
          <Label htmlFor={id("toVerify")}>{t.toVerify}</Label>
        </div>
      )}
      <FormMessage kind="error">{error}</FormMessage>
      <DialogFormActions
        pending={pending}
        submitLabel={fr.marketing.activations.save}
        onCancel={onDone}
      />
    </form>
  );
}
