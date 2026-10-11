"use client";

import { IconPlus } from "nucleo-sharp-essential";
import { useState } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { DialogButton } from "@/components/ui/dialog-button";
import { FilePickField } from "@/components/ui/file-pick-field";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  decideAgencyReport,
  receiveAgencyReport,
} from "@/lib/activations/agency/report-actions";
import { uploadActivationFile } from "@/lib/activations/files/upload";
import type { ActivationScope } from "@/lib/activations/types";
import { fr } from "@/lib/i18n/fr";

const t = fr.activationAgency.report;
type Decision = keyof typeof t.decide;

function ReportForm({
  scope,
  today,
  onDone,
}: {
  scope: ActivationScope;
  today: string;
  onDone: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const { pending, error, run } = useWriteSubmit(onDone, t.received);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        run(async () => {
          let fileId: string | null = null;
          if (file) {
            const uploaded = await uploadActivationFile({
              ...scope,
              kind: "agency_report",
              file,
            });
            if (!uploaded.ok) return uploaded;
            fileId = uploaded.fileId;
          }
          return receiveAgencyReport({
            projectId: scope.projectId,
            activationId: scope.activationId,
            fileId,
            url: String(data.get("url") ?? "").trim(),
            body: String(data.get("body") ?? ""),
            receivedOn: String(data.get("receivedOn") || today),
          });
        });
      }}
    >
      <FilePickField
        id="report-file"
        label={t.file}
        hint={fr.activations.fileHint}
        chosenLabel={fr.activations.fileChosen}
        file={file}
        onFile={setFile}
      />
      <Field
        name="url"
        type="url"
        label={t.url}
        placeholder="https://"
        maxLength={2000}
      />
      <TextareaField name="body" label={t.body} rows={6} maxLength={50000} />
      <Field
        name="receivedOn"
        type="date"
        label={t.receivedOn}
        required
        defaultValue={today}
        max={today}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.add}
        </Button>
      </div>
    </form>
  );
}

export function AddReportButton(props: {
  scope: ActivationScope;
  today: string;
}) {
  return (
    <DialogButton
      label={t.add}
      icon={IconPlus}
      variant="default"
      title={t.addTitle}
      description={t.addDescription}
    >
      {(close) => <ReportForm {...props} onDone={close} />}
    </DialogButton>
  );
}

function DecisionForm({
  projectId,
  activationId,
  reportId,
  decision,
  reserves,
  onDone,
}: {
  projectId: string;
  activationId: string;
  reportId: string;
  decision: Decision;
  reserves: string[];
  onDone: () => void;
}) {
  const { pending, error, run } = useWriteSubmit(onDone, t.decided);
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const comment = String(
          new FormData(event.currentTarget).get("comment") ?? "",
        );
        run(() =>
          decideAgencyReport({
            projectId,
            activationId,
            reportId,
            decision,
            comment,
          }),
        );
      }}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-medium">{t.reserves}</h3>
        {reserves.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noReserves}</p>
        ) : (
          <ul className="list-disc pl-5 text-sm">
            {reserves.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
      </div>
      <TextareaField
        name="comment"
        label={t.comment}
        hint={t.commentHint}
        rows={3}
        maxLength={2000}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="lg" onClick={onDone}>
          {fr.activations.cancel}
        </Button>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? fr.activations.saving : t.decide[decision]}
        </Button>
      </div>
    </form>
  );
}

/** The decisions on a report, each showing the reserves it keeps. A
 * definitive validation despite reserves is a PDS validator's (the database
 * refuses it to anyone else) : not offered otherwise. */
export function ReportDecisionButtons({
  canValidate,
  ...props
}: {
  projectId: string;
  activationId: string;
  reportId: string;
  reserves: string[];
  canValidate: boolean;
}) {
  const decisions = (Object.keys(t.decide) as Decision[]).filter(
    (d) => d !== "validated" || canValidate || props.reserves.length === 0,
  );
  return (
    <div className="flex flex-wrap gap-2">
      {decisions.map((d) => (
        <DialogButton
          key={d}
          label={t.decide[d]}
          size="xs"
          variant={d === "provisional" ? "default" : "outline"}
          title={t.decideTitle}
          description={t.decideDescription}
        >
          {(close) => <DecisionForm {...props} decision={d} onDone={close} />}
        </DialogButton>
      ))}
    </div>
  );
}
