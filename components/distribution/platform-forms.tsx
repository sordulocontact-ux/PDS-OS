"use client";

import { useState, type FormEvent } from "react";

import { Field } from "@/components/auth/field";
import { FormMessage } from "@/components/auth/form-message";
import { TextareaField } from "@/components/auth/textarea-field";
import { Button } from "@/components/ui/button";
import { ChoiceCards } from "@/components/ui/choice-cards";
import { DialogButton } from "@/components/ui/dialog-button";
import { DialogFormActions } from "@/components/ui/dialog-form-actions";
import { useWriteSubmit } from "@/components/ui/use-write-submit";
import {
  COMPLIANCES,
  VERIFICATIONS,
  type Compliance,
  type Verification,
} from "@/lib/distribution/platforms";
import {
  saveDistributionPlatform,
  verifyDistributionPlatform,
} from "@/lib/distribution/platforms-actions";
import { fr } from "@/lib/i18n/fr";

const t = fr.distribution.platforms;

/** The link and declared availability of a platform, or a new one. */
export function PlatformEditButton({
  projectId,
  platform,
  name,
  url,
  declared,
  suggestion,
}: {
  projectId: string;
  // Empty for a platform added by hand.
  platform: string;
  name: string | null;
  url: string | null;
  declared: boolean;
  suggestion: string | null;
}) {
  const adding = platform === "";
  return (
    <DialogButton
      label={adding ? t.add : url ? t.edit : t.addLink}
      title={adding ? t.form.addTitle : t.form.title(name ?? "")}
      description={adding ? t.form.addDescription : t.form.description}
    >
      {(close) => (
        <PlatformForm
          projectId={projectId}
          platform={platform}
          name={name}
          url={url}
          declared={declared}
          suggestion={suggestion}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function PlatformForm({
  projectId,
  platform,
  name,
  url,
  declared,
  suggestion,
  onDone,
}: {
  projectId: string;
  platform: string;
  name: string | null;
  url: string | null;
  declared: boolean;
  suggestion: string | null;
  onDone: () => void;
}) {
  const [link, setLink] = useState(url ?? "");
  const [available, setAvailable] = useState<"yes" | "no">(
    declared ? "yes" : "no",
  );
  const { pending, error, run } = useWriteSubmit(onDone, t.form.saved);
  const custom = platform === "" || platform.startsWith("other_");

  function submit(event: FormEvent<HTMLFormElement>) {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    run(() =>
      saveDistributionPlatform({
        projectId,
        platform,
        label: String(data.get("label") ?? ""),
        url: link,
        available: available === "yes",
      }),
    );
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
      {custom && (
        <Field
          name="label"
          label={t.form.label}
          maxLength={80}
          defaultValue={name ?? ""}
          required
        />
      )}
      <Field
        name="url"
        label={t.form.url}
        hint={t.form.urlHint}
        type="url"
        maxLength={2048}
        value={link}
        onChange={(event) => setLink(event.target.value)}
      />
      {suggestion && link !== suggestion && (
        <div className="grid gap-1 text-sm">
          <p className="text-muted-foreground">{t.suggestion}</p>
          <p className="break-all">{suggestion}</p>
          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setLink(suggestion)}
            >
              {t.useSuggestion}
            </Button>
          </div>
        </div>
      )}
      <ChoiceCards
        name="available"
        legend={t.form.available}
        value={available}
        onChange={setAvailable}
        columns={3}
        choices={[
          { value: "no", label: t.form.availableChoices.no },
          { value: "yes", label: t.form.availableChoices.yes },
        ]}
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

/** « Vérifier »: what a person saw when opening the link. */
export function PlatformVerifyButton({
  projectId,
  platform,
  name,
  verification,
  verificationNote,
  compliance,
  complianceNote,
}: {
  projectId: string;
  platform: string;
  name: string;
  verification: Verification;
  verificationNote: string | null;
  compliance: Compliance;
  complianceNote: string | null;
}) {
  return (
    <DialogButton
      label={t.verify}
      title={t.form.verifyTitle(name)}
      description={t.form.verifyDescription}
    >
      {(close) => (
        <VerifyForm
          projectId={projectId}
          platform={platform}
          verification={verification}
          verificationNote={verificationNote}
          compliance={compliance}
          complianceNote={complianceNote}
          onDone={close}
        />
      )}
    </DialogButton>
  );
}

function VerifyForm({
  projectId,
  platform,
  verification,
  verificationNote,
  compliance,
  complianceNote,
  onDone,
}: {
  projectId: string;
  platform: string;
  verification: Verification;
  verificationNote: string | null;
  compliance: Compliance;
  complianceNote: string | null;
  onDone: () => void;
}) {
  const [seen, setSeen] = useState<Verification>(
    verification === "unchecked" ? "verified" : verification,
  );
  const [match, setMatch] = useState<Compliance>(compliance);
  const [noteError, setNoteError] = useState<{ seen?: string; match?: string }>(
    {},
  );
  const { pending, error, run } = useWriteSubmit(onDone, t.form.verified);

  function submit(event: FormEvent<HTMLFormElement>) {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const seenNote = String(data.get("verificationNote") ?? "");
    const matchNote = String(data.get("complianceNote") ?? "");
    const errors = {
      seen:
        seen === "unavailable" && !seenNote.trim()
          ? t.form.noteRequired
          : undefined,
      match:
        match === "non_compliant" && !matchNote.trim()
          ? t.form.noteRequired
          : undefined,
    };
    setNoteError(errors);
    if (errors.seen || errors.match) return;
    run(() =>
      verifyDistributionPlatform({
        projectId,
        platform,
        verification: seen,
        verificationNote: seenNote,
        compliance: match,
        complianceNote: matchNote,
      }),
    );
  }

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={submit}>
      <ChoiceCards
        name="verification"
        legend={t.verification}
        value={seen}
        onChange={setSeen}
        choices={VERIFICATIONS.map((value) => ({
          value,
          label: t.verifications[value],
          hint: t.verificationHints[value],
        }))}
      />
      <TextareaField
        name="verificationNote"
        label={t.form.verificationNote}
        rows={2}
        maxLength={1000}
        defaultValue={verificationNote ?? ""}
        required={seen === "unavailable"}
        error={noteError.seen}
      />
      <ChoiceCards
        name="compliance"
        legend={t.compliance}
        value={match}
        onChange={setMatch}
        choices={COMPLIANCES.map((value) => ({
          value,
          label: t.compliances[value],
          hint: t.complianceHints[value],
        }))}
      />
      <TextareaField
        name="complianceNote"
        label={t.form.complianceNote}
        rows={2}
        maxLength={1000}
        defaultValue={complianceNote ?? ""}
        required={match === "non_compliant"}
        error={noteError.match}
      />
      {error && <FormMessage kind="error">{error}</FormMessage>}
      <DialogFormActions
        pending={pending}
        submitLabel={t.form.verifySubmit}
        onCancel={onDone}
      />
    </form>
  );
}
